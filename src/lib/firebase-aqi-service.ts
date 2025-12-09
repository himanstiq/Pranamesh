'use client';

import { ref, onValue, get, set, off, DataSnapshot } from 'firebase/database';
import { getFirebaseDatabase, isFirebaseConfigured } from './firebase';
import type { AQIStation } from '@/types';

/**
 * Firebase AQI data structure for a single station
 */
export interface FirebaseAQIData {
    aqi: number;
    pm25?: number;
    pm10?: number;
    co?: number;
    no2?: number;
    so2?: number;
    o3?: number;
    lastUpdated: string;
}

/**
 * Firebase stations collection structure
 */
export interface FirebaseStationsData {
    [stationId: string]: FirebaseAQIData;
}

/**
 * Callback type for real-time updates
 */
type AQIUpdateCallback = (data: FirebaseStationsData) => void;

// Active subscriptions tracking
const activeSubscriptions: Map<string, AQIUpdateCallback> = new Map();

/**
 * Subscribe to real-time AQI data updates from Firebase
 * @param callback Function to call when data changes
 * @returns Unsubscribe function
 */
export function subscribeToAQIData(callback: AQIUpdateCallback): () => void {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured, skipping subscription');
        return () => { };
    }

    const database = getFirebaseDatabase();
    if (!database) {
        console.warn('Firebase database not available');
        return () => { };
    }

    const stationsRef = ref(database, 'stations');
    const subscriptionId = `sub_${Date.now()}`;

    const handleValue = (snapshot: DataSnapshot) => {
        const data = snapshot.val() as FirebaseStationsData | null;
        if (data) {
            console.log('Firebase AQI data updated:', Object.keys(data).length, 'stations');
            callback(data);
        }
    };

    onValue(stationsRef, handleValue, (error) => {
        console.error('Firebase subscription error:', error);
    });

    activeSubscriptions.set(subscriptionId, callback);

    // Return unsubscribe function
    return () => {
        off(stationsRef, 'value', handleValue);
        activeSubscriptions.delete(subscriptionId);
        console.log('Unsubscribed from Firebase AQI data');
    };
}

/**
 * Get AQI data from Firebase (one-time fetch)
 */
export async function getAQIDataFromFirebase(): Promise<FirebaseStationsData | null> {
    if (!isFirebaseConfigured()) {
        return null;
    }

    const database = getFirebaseDatabase();
    if (!database) {
        return null;
    }

    try {
        const stationsRef = ref(database, 'stations');
        const snapshot = await get(stationsRef);

        if (snapshot.exists()) {
            return snapshot.val() as FirebaseStationsData;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch Firebase AQI data:', error);
        return null;
    }
}

/**
 * Update a single station's AQI data in Firebase (for testing/admin)
 */
export async function updateStationAQI(
    stationId: string,
    data: Partial<FirebaseAQIData>
): Promise<boolean> {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured');
        return false;
    }

    const database = getFirebaseDatabase();
    if (!database) {
        return false;
    }

    try {
        const stationRef = ref(database, `stations/${stationId}`);
        await set(stationRef, {
            ...data,
            lastUpdated: new Date().toISOString(),
        });
        console.log(`Updated station ${stationId} in Firebase`);
        return true;
    } catch (error) {
        console.error('Failed to update Firebase AQI data:', error);
        return false;
    }
}

/**
 * Initialize Firebase database with sample station data
 * (For testing purposes - call this once to set up initial data)
 */
export async function initializeSampleData(stations: AQIStation[]): Promise<boolean> {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured');
        return false;
    }

    const database = getFirebaseDatabase();
    if (!database) {
        return false;
    }

    try {
        const stationsData: FirebaseStationsData = {};

        for (const station of stations) {
            stationsData[station.id] = {
                aqi: station.aqi,
                pm25: station.pollutants.pm25,
                pm10: station.pollutants.pm10,
                co: station.pollutants.co,
                no2: station.pollutants.no2,
                so2: station.pollutants.so2,
                o3: station.pollutants.o3,
                lastUpdated: station.lastUpdated,
            };
        }

        const stationsRef = ref(database, 'stations');
        await set(stationsRef, stationsData);
        console.log(`Initialized Firebase with ${stations.length} stations`);
        return true;
    } catch (error) {
        console.error('Failed to initialize Firebase data:', error);
        return false;
    }
}

/**
 * Merge Firebase data with existing station metadata
 */
export function mergeFirebaseDataWithStations(
    stations: AQIStation[],
    firebaseData: FirebaseStationsData
): AQIStation[] {
    return stations.map(station => {
        const firebaseStation = firebaseData[station.id];

        if (firebaseStation) {
            // Determine status based on AQI
            const getStatus = (aqi: number): AQIStation['status'] => {
                if (aqi <= 50) return 'good';
                if (aqi <= 100) return 'moderate';
                if (aqi <= 150) return 'poor';
                if (aqi <= 200) return 'unhealthy';
                if (aqi <= 300) return 'severe';
                return 'hazardous';
            };

            return {
                ...station,
                aqi: firebaseStation.aqi,
                status: getStatus(firebaseStation.aqi),
                pollutants: {
                    ...station.pollutants,
                    pm25: firebaseStation.pm25 ?? station.pollutants.pm25,
                    pm10: firebaseStation.pm10 ?? station.pollutants.pm10,
                    co: firebaseStation.co ?? station.pollutants.co,
                    no2: firebaseStation.no2 ?? station.pollutants.no2,
                    so2: firebaseStation.so2 ?? station.pollutants.so2,
                    o3: firebaseStation.o3 ?? station.pollutants.o3,
                },
                lastUpdated: firebaseStation.lastUpdated || station.lastUpdated,
            };
        }

        return station;
    });
}
