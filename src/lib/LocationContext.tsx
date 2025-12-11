'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface LocationState {
    lat: number | null;
    lng: number | null;
    name: string | null;
    error: string | null;
    isLoading: boolean;
    isEnabled: boolean;
}

interface LocationAQI {
    aqi: number;
    pm25: number;
    pm10: number;
    cityName: string;
    lastUpdated: string;
}

interface LocationContextType {
    location: LocationState;
    locationAQI: LocationAQI | null;
    requestLocation: () => Promise<void>;
    clearLocation: () => void;
    isLocationBased: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'pranamesh_user_location';

export function LocationProvider({ children }: { children: ReactNode }) {
    const [location, setLocation] = useState<LocationState>({
        lat: null,
        lng: null,
        name: null,
        error: null,
        isLoading: false,
        isEnabled: false,
    });
    const [locationAQI, setLocationAQI] = useState<LocationAQI | null>(null);

    // Load saved location on mount
    useEffect(() => {
        const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.lat && parsed.lng) {
                    setLocation(prev => ({
                        ...prev,
                        lat: parsed.lat,
                        lng: parsed.lng,
                        name: parsed.name || null,
                        isEnabled: true,
                    }));
                }
            } catch {
                // Invalid saved data
                localStorage.removeItem(LOCATION_STORAGE_KEY);
            }
        }
    }, []);

    // Fetch AQI when location changes
    useEffect(() => {
        if (location.lat && location.lng && location.isEnabled) {
            fetchLocationAQI(location.lat, location.lng);
        }
    }, [location.lat, location.lng, location.isEnabled]);

    const fetchLocationAQI = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`/api/aqi/location?lat=${lat}&lng=${lng}`);
            const data = await response.json();

            if (data.success) {
                setLocationAQI({
                    aqi: data.aqi,
                    pm25: data.pm25,
                    pm10: data.pm10,
                    cityName: data.cityName,
                    lastUpdated: data.lastUpdated,
                });

                // Update location name if available
                if (data.cityName) {
                    setLocation(prev => ({ ...prev, name: data.cityName }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch location AQI:', error);
        }
    };

    const requestLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocation(prev => ({
                ...prev,
                error: 'Geolocation is not supported by your browser',
                isLoading: false,
            }));
            return;
        }

        setLocation(prev => ({ ...prev, isLoading: true, error: null }));

        return new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    const newLocation = {
                        lat: latitude,
                        lng: longitude,
                        name: null,
                        error: null,
                        isLoading: false,
                        isEnabled: true,
                    };

                    setLocation(newLocation);

                    // Save to localStorage
                    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
                        lat: latitude,
                        lng: longitude,
                    }));

                    resolve();
                },
                (error) => {
                    let errorMessage = 'Failed to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please enable location permissions.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                    }

                    setLocation(prev => ({
                        ...prev,
                        error: errorMessage,
                        isLoading: false,
                    }));
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5 * 60 * 1000, // 5 minutes cache
                }
            );
        });
    }, []);

    const clearLocation = useCallback(() => {
        setLocation({
            lat: null,
            lng: null,
            name: null,
            error: null,
            isLoading: false,
            isEnabled: false,
        });
        setLocationAQI(null);
        localStorage.removeItem(LOCATION_STORAGE_KEY);
    }, []);

    const isLocationBased = location.isEnabled && location.lat !== null && location.lng !== null;

    return (
        <LocationContext.Provider value={{
            location,
            locationAQI,
            requestLocation,
            clearLocation,
            isLocationBased,
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
