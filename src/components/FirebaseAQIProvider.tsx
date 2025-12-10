'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { getFirebaseDatabase, isFirebaseConfigured, isRealtimeDatabaseConfigured } from '@/lib/firebase';
import type { AQIStation, Pollutants } from '@/types';

// ============================================
// Types
// ============================================

interface FirebaseStationData {
    aqi: number;
    pm25: number;
    pm10: number;
    co?: number;
    no2?: number;
    so2?: number;
    o3?: number;
    lastUpdated: string;
    source?: string;
}

interface FirebaseAQIContextType {
    // Connection status
    isConnected: boolean;
    isConfigured: boolean;
    error: string | null;

    // Real-time data
    stationData: Record<string, FirebaseStationData>;
    lastUpdate: Date | null;

    // Methods
    getStationAQI: (stationId: string) => FirebaseStationData | null;
    mergeWithStations: (stations: AQIStation[]) => AQIStation[];
    refreshConnection: () => void;
}

const FirebaseAQIContext = createContext<FirebaseAQIContextType | null>(null);

// ============================================
// Provider Component
// ============================================

interface FirebaseAQIProviderProps {
    children: ReactNode;
}

export function FirebaseAQIProvider({ children }: FirebaseAQIProviderProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stationData, setStationData] = useState<Record<string, FirebaseStationData>>({});
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Initialize Firebase connection
    const initializeConnection = useCallback(() => {
        // Check configuration
        const configured = isFirebaseConfigured();
        const rtdbConfigured = isRealtimeDatabaseConfigured();
        setIsConfigured(configured && rtdbConfigured);

        if (!configured || !rtdbConfigured) {
            setError('Firebase not configured. Set environment variables.');
            return;
        }

        const database = getFirebaseDatabase();
        if (!database) {
            setError('Failed to initialize Firebase database');
            return;
        }

        // Subscribe to stations data
        const stationsRef = ref(database, 'stations');

        const handleValue = (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                setStationData(data);
                setLastUpdate(new Date());
                setIsConnected(true);
                setError(null);
                console.log(`Firebase: Received data for ${Object.keys(data).length} stations`);
            }
        };

        const handleError = (err: Error) => {
            console.error('Firebase connection error:', err);
            setError(err.message);
            setIsConnected(false);
        };

        try {
            onValue(stationsRef, handleValue, handleError);
            setIsConnected(true);
        } catch (err) {
            setError(String(err));
            setIsConnected(false);
        }

        // Cleanup function
        return () => {
            off(stationsRef, 'value', handleValue);
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: Firebase initialization must happen on mount
        const cleanup = initializeConnection();
        return () => {
            if (cleanup) cleanup();
        };
    }, [initializeConnection]);

    // Get AQI data for a specific station
    const getStationAQI = useCallback(
        (stationId: string): FirebaseStationData | null => {
            return stationData[stationId] || null;
        },
        [stationData]
    );

    // Merge Firebase data with existing stations
    const mergeWithStations = useCallback(
        (stations: AQIStation[]): AQIStation[] => {
            if (Object.keys(stationData).length === 0) {
                return stations;
            }

            return stations.map((station) => {
                const firebaseData = stationData[station.id];

                if (firebaseData) {
                    // Determine status based on AQI
                    const getStatus = (aqi: number): AQIStation['status'] => {
                        if (aqi <= 50) return 'good';
                        if (aqi <= 100) return 'moderate';
                        if (aqi <= 150) return 'poor';
                        if (aqi <= 200) return 'unhealthy';
                        if (aqi <= 300) return 'severe';
                        return 'hazardous';
                    };

                    const updatedPollutants: Pollutants = {
                        pm25: firebaseData.pm25 ?? station.pollutants.pm25,
                        pm10: firebaseData.pm10 ?? station.pollutants.pm10,
                        co: firebaseData.co ?? station.pollutants.co,
                        no2: firebaseData.no2 ?? station.pollutants.no2,
                        so2: firebaseData.so2 ?? station.pollutants.so2,
                        o3: firebaseData.o3 ?? station.pollutants.o3,
                    };

                    return {
                        ...station,
                        aqi: firebaseData.aqi,
                        status: getStatus(firebaseData.aqi),
                        pollutants: updatedPollutants,
                        lastUpdated: firebaseData.lastUpdated || station.lastUpdated,
                    };
                }

                return station;
            });
        },
        [stationData]
    );

    // Refresh connection
    const refreshConnection = useCallback(() => {
        initializeConnection();
    }, [initializeConnection]);

    const value: FirebaseAQIContextType = {
        isConnected,
        isConfigured,
        error,
        stationData,
        lastUpdate,
        getStationAQI,
        mergeWithStations,
        refreshConnection,
    };

    return (
        <FirebaseAQIContext.Provider value={value}>
            {children}
        </FirebaseAQIContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useFirebaseAQI(): FirebaseAQIContextType {
    const context = useContext(FirebaseAQIContext);

    if (!context) {
        throw new Error('useFirebaseAQI must be used within a FirebaseAQIProvider');
    }

    return context;
}

// ============================================
// Status Component
// ============================================

interface FirebaseStatusBadgeProps {
    showDetails?: boolean;
}

export function FirebaseStatusBadge({ showDetails = false }: FirebaseStatusBadgeProps) {
    const { isConnected, isConfigured, lastUpdate, error } = useFirebaseAQI();

    if (!isConfigured) {
        return (
            <div className="firebase-status not-configured" title="Firebase not configured">
                <span className="status-dot" />
                <span className="status-text">Not Configured</span>
                <style jsx>{`
                    .firebase-status {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.35rem 0.75rem;
                        border-radius: 9999px;
                        font-size: 0.75rem;
                        font-weight: 500;
                    }
                    .firebase-status.not-configured {
                        background: rgba(156, 163, 175, 0.1);
                        color: #9ca3af;
                    }
                    .status-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: currentColor;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className={`firebase-status ${isConnected ? 'connected' : 'disconnected'}`}
            title={error || (isConnected ? 'Firebase connected' : 'Firebase disconnected')}
        >
            <span className="status-dot" />
            <span className="status-text">
                {isConnected ? 'Live' : 'Offline'}
            </span>
            {showDetails && lastUpdate && (
                <span className="last-update">
                    {lastUpdate.toLocaleTimeString()}
                </span>
            )}

            <style jsx>{`
                .firebase-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.35rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                .firebase-status.connected {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }
                .firebase-status.disconnected {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: ${isConnected ? 'pulse 2s ease-in-out infinite' : 'none'};
                }
                .last-update {
                    opacity: 0.7;
                    margin-left: 0.25rem;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
