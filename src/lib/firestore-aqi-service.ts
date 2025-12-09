'use client';

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, set, get, update } from 'firebase/database';
import { getFirebaseFirestore, getFirebaseDatabase, isFirebaseConfigured, isRealtimeDatabaseConfigured } from './firebase';
import type { AQIStation, Pollutants } from '@/types';

// ============================================
// Types
// ============================================

export interface AQIReading {
    id?: string;
    stationId: string;
    aqi: number;
    pollutants: Pollutants;
    timestamp: Date;
    source: 'manual' | 'sensor' | 'api';
    metadata?: {
        deviceId?: string;
        operatorId?: string;
        notes?: string;
    };
}

export interface StationMetadata {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
    type: 'government' | 'pranamesh' | 'industrial' | 'waqi';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface FirestoreResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================
// Station Management (Firestore)
// ============================================

/**
 * Save or update station metadata in Firestore
 */
export async function saveStationMetadata(station: Omit<StationMetadata, 'createdAt' | 'updatedAt'>): Promise<FirestoreResult<StationMetadata>> {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase not configured' };
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
        return { success: false, error: 'Firestore not available' };
    }

    try {
        const now = new Date();
        const stationRef = doc(firestore, 'stations', station.id);
        const existingDoc = await getDoc(stationRef);

        const stationData: StationMetadata = {
            ...station,
            createdAt: existingDoc.exists() ? existingDoc.data().createdAt?.toDate() || now : now,
            updatedAt: now,
        };

        await setDoc(stationRef, {
            ...stationData,
            createdAt: Timestamp.fromDate(stationData.createdAt),
            updatedAt: Timestamp.fromDate(stationData.updatedAt),
        });

        console.log(`Station ${station.id} saved to Firestore`);
        return { success: true, data: stationData };
    } catch (error) {
        console.error('Failed to save station:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get all stations from Firestore
 */
export async function getAllStations(): Promise<FirestoreResult<StationMetadata[]>> {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase not configured' };
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
        return { success: false, error: 'Firestore not available' };
    }

    try {
        const stationsRef = collection(firestore, 'stations');
        const q = query(stationsRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);

        const stations: StationMetadata[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as StationMetadata));

        return { success: true, data: stations };
    } catch (error) {
        console.error('Failed to get stations:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Delete a station from Firestore
 */
export async function deleteStation(stationId: string): Promise<FirestoreResult<void>> {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase not configured' };
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
        return { success: false, error: 'Firestore not available' };
    }

    try {
        await deleteDoc(doc(firestore, 'stations', stationId));
        console.log(`Station ${stationId} deleted from Firestore`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete station:', error);
        return { success: false, error: String(error) };
    }
}

// ============================================
// AQI Readings (Firestore for history)
// ============================================

/**
 * Save a new AQI reading to Firestore
 */
export async function saveAQIReading(reading: Omit<AQIReading, 'id'>): Promise<FirestoreResult<AQIReading>> {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase not configured' };
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
        return { success: false, error: 'Firestore not available' };
    }

    try {
        const readingsRef = collection(firestore, 'readings');

        // Build document data, excluding undefined fields (Firestore doesn't accept undefined)
        const docData: Record<string, unknown> = {
            stationId: reading.stationId,
            aqi: reading.aqi,
            pollutants: reading.pollutants,
            timestamp: Timestamp.fromDate(reading.timestamp),
            source: reading.source,
        };

        // Only add metadata if it exists and has content
        if (reading.metadata && Object.keys(reading.metadata).length > 0) {
            docData.metadata = reading.metadata;
        }

        console.log('[Firestore] Starting saveAQIReading...', docData);

        // Create a timeout promise for Firestore operation
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Firestore operation timed out after 10000ms')), 10000);
        });

        // Race between the actual operation and timeout
        const docRef = await Promise.race([
            addDoc(readingsRef, docData),
            timeoutPromise
        ]) as Awaited<ReturnType<typeof addDoc>>;

        const savedReading: AQIReading = {
            id: docRef.id,
            ...reading,
        };

        console.log(`[Firestore] AQI reading saved successfully: ${docRef.id}`);

        // Also update Realtime Database for live sync
        // We don't await this if we want it to be truly non-blocking, but await ensures inconsistent state is caught
        // Given the user issue, let's keep it awaited but ensure it has its own short timeout
        await syncToRealtimeDatabase(reading.stationId, reading);

        return { success: true, data: savedReading };
    } catch (error) {
        console.error('[Firestore] Failed to save AQI reading:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get AQI readings for a station with optional date filtering
 */
export async function getAQIReadings(
    stationId: string,
    options?: {
        startDate?: Date;
        endDate?: Date;
        maxResults?: number;
    }
): Promise<FirestoreResult<AQIReading[]>> {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase not configured' };
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
        return { success: false, error: 'Firestore not available' };
    }

    try {
        const readingsRef = collection(firestore, 'readings');
        let q = query(
            readingsRef,
            where('stationId', '==', stationId),
            orderBy('timestamp', 'desc'),
            limit(options?.maxResults || 100)
        );

        if (options?.startDate) {
            q = query(q, where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
        }
        if (options?.endDate) {
            q = query(q, where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
        }

        const snapshot = await getDocs(q);

        const readings: AQIReading[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            stationId: doc.data().stationId,
            aqi: doc.data().aqi,
            pollutants: doc.data().pollutants,
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            source: doc.data().source,
            metadata: doc.data().metadata,
        }));

        return { success: true, data: readings };
    } catch (error) {
        console.error('Failed to get AQI readings:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get latest reading for a station
 */
export async function getLatestReading(stationId: string): Promise<FirestoreResult<AQIReading | null>> {
    const result = await getAQIReadings(stationId, { maxResults: 1 });
    if (!result.success) {
        return { success: false, error: result.error };
    }
    return { success: true, data: result.data?.[0] || null };
}

// ============================================
// Realtime Database Sync
// ============================================

/**
 * Sync AQI data to Realtime Database for live updates
 * Uses a timeout to prevent hanging when database is misconfigured
 */
async function syncToRealtimeDatabase(stationId: string, reading: Omit<AQIReading, 'id'>): Promise<void> {
    console.log(`[RealtimeDB] syncToRealtimeDatabase called for station: ${stationId}`);

    if (!isRealtimeDatabaseConfigured()) {
        console.warn('[RealtimeDB] [WARN] Realtime Database not configured (missing API key or DATABASE_URL), skipping sync');
        return;
    }
    console.log('[RealtimeDB] Configuration check passed');

    const database = getFirebaseDatabase();
    if (!database) {
        console.warn('[RealtimeDB] [WARN] Could not get Firebase Database instance');
        return;
    }
    console.log('[RealtimeDB] Database instance obtained');

    // Create a timeout promise to prevent hanging (10 seconds to allow for network latency)
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Realtime Database sync timeout after 10 seconds')), 10000);
    });

    console.log(`[RealtimeDB] Starting sync for station: ${stationId}...`);

    try {
        const stationRef = ref(database, `stations/${stationId}`);
        const dataToSync = {
            aqi: reading.aqi,
            pm25: reading.pollutants.pm25,
            pm10: reading.pollutants.pm10,
            co: reading.pollutants.co,
            no2: reading.pollutants.no2,
            so2: reading.pollutants.so2,
            o3: reading.pollutants.o3,
            lastUpdated: reading.timestamp.toISOString(),
            source: reading.source,
        };
        console.log(`[RealtimeDB] Data to sync:`, dataToSync);

        const setPromise = set(stationRef, dataToSync);

        // Race between the actual operation and timeout
        await Promise.race([setPromise, timeoutPromise]);
        console.log(`[RealtimeDB] [OK] Station ${stationId} synced successfully!`);
    } catch (error) {
        console.warn('[RealtimeDB] [ERROR] Failed to sync (non-blocking):', error);
        // Don't throw - this is a non-critical operation
    }
}

/**
 * Batch update multiple stations in Realtime Database
 */
export async function batchUpdateRealtimeDB(
    updates: Array<{ stationId: string; aqi: number; pollutants: Partial<Pollutants> }>
): Promise<FirestoreResult<void>> {
    if (!isRealtimeDatabaseConfigured()) {
        return { success: false, error: 'Realtime Database not configured' };
    }

    const database = getFirebaseDatabase();
    if (!database) {
        return { success: false, error: 'Database not available' };
    }

    try {
        const updatePromises = updates.map(async ({ stationId, aqi, pollutants }) => {
            const stationRef = ref(database, `stations/${stationId}`);
            return update(stationRef, {
                aqi,
                ...pollutants,
                lastUpdated: new Date().toISOString(),
            });
        });

        await Promise.all(updatePromises);
        console.log(`Batch updated ${updates.length} stations`);
        return { success: true };
    } catch (error) {
        console.error('Failed to batch update:', error);
        return { success: false, error: String(error) };
    }
}

// ============================================
// Combined Operations
// ============================================

/**
 * Full AQI update: saves to Firestore (history) and syncs to Realtime DB (live)
 */
export async function updateAQIData(
    stationId: string,
    data: {
        aqi: number;
        pollutants: Pollutants;
        source?: 'manual' | 'sensor' | 'api';
        metadata?: AQIReading['metadata'];
    }
): Promise<FirestoreResult<AQIReading>> {
    const reading: Omit<AQIReading, 'id'> = {
        stationId,
        aqi: data.aqi,
        pollutants: data.pollutants,
        timestamp: new Date(),
        source: data.source || 'manual',
        metadata: data.metadata,
    };

    return saveAQIReading(reading);
}

/**
 * Initialize stations from AQIStation array (useful for seeding data)
 */
export async function initializeStationsFromData(stations: AQIStation[]): Promise<FirestoreResult<number>> {
    let successCount = 0;
    const errors: string[] = [];

    for (const station of stations) {
        // Save station metadata
        const metadataResult = await saveStationMetadata({
            id: station.id,
            name: station.name,
            location: station.location,
            lat: station.lat,
            lng: station.lng,
            type: station.type,
            isActive: true,
        });

        if (metadataResult.success) {
            // Save initial reading
            const readingResult = await updateAQIData(station.id, {
                aqi: station.aqi,
                pollutants: station.pollutants,
                source: 'api',
            });

            if (readingResult.success) {
                successCount++;
            } else {
                errors.push(`Reading for ${station.id}: ${readingResult.error}`);
            }
        } else {
            errors.push(`Metadata for ${station.id}: ${metadataResult.error}`);
        }
    }

    if (errors.length > 0) {
        console.warn('Some stations failed to initialize:', errors);
    }

    return { success: successCount > 0, data: successCount };
}

/**
 * Get aggregated statistics for a station
 */
export async function getStationStats(
    stationId: string,
    days: number = 7
): Promise<FirestoreResult<{
    avgAqi: number;
    maxAqi: number;
    minAqi: number;
    readingCount: number;
}>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await getAQIReadings(stationId, {
        startDate,
        maxResults: 1000,
    });

    if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No data' };
    }

    const readings = result.data;
    if (readings.length === 0) {
        return {
            success: true,
            data: { avgAqi: 0, maxAqi: 0, minAqi: 0, readingCount: 0 },
        };
    }

    const aqiValues = readings.map((r) => r.aqi);
    const avgAqi = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);
    const maxAqi = Math.max(...aqiValues);
    const minAqi = Math.min(...aqiValues);

    return {
        success: true,
        data: {
            avgAqi,
            maxAqi,
            minAqi,
            readingCount: readings.length,
        },
    };
}
