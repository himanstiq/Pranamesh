'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ref, onValue, set, off } from 'firebase/database';
import { getFirebaseDatabase, isFirebaseConfigured, isRealtimeDatabaseConfigured } from './firebase';

// ============================================
// Types
// ============================================

interface SystemSettings {
    manualMode: boolean;
}

interface SystemSettingsContextType {
    settings: SystemSettings;
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;
    setManualMode: (enabled: boolean) => Promise<boolean>;
}

interface SystemSettingsProviderProps {
    children: ReactNode;
}

// ============================================
// Default Settings
// ============================================

const DEFAULT_SETTINGS: SystemSettings = {
    manualMode: false,
};

// ============================================
// Context
// ============================================

const SystemSettingsContext = createContext<SystemSettingsContextType | null>(null);

// ============================================
// Provider Component
// ============================================

export function SystemSettingsProvider({ children }: SystemSettingsProviderProps) {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize and subscribe to settings from Firebase
    useEffect(() => {
        const configured = isFirebaseConfigured() && isRealtimeDatabaseConfigured();

        if (!configured) {
            console.log('[SystemSettings] Firebase not configured, using defaults');
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: mark loading complete when Firebase not configured
            setIsLoading(false);
            return;
        }

        const database = getFirebaseDatabase();
        if (!database) {
            console.log('[SystemSettings] Could not get database instance');
             
            setIsLoading(false);
            return;
        }

        const settingsRef = ref(database, 'settings');

        const handleValue = (snapshot: import('firebase/database').DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                setSettings({
                    manualMode: data.manualMode ?? false,
                });
                setIsConnected(true);
                console.log('[SystemSettings] Loaded settings:', data);
            } else {
                // Initialize settings if they don't exist
                set(settingsRef, DEFAULT_SETTINGS).catch(console.error);
            }
            setIsLoading(false);
            setError(null);
        };

        const handleError = (err: Error) => {
            console.error('[SystemSettings] Error:', err);
            setError(err.message);
            setIsConnected(false);
            setIsLoading(false);
        };

        try {
            onValue(settingsRef, handleValue, handleError);
        } catch (err) {
            setError(String(err));
            setIsLoading(false);
        }

        return () => {
            off(settingsRef, 'value', handleValue);
        };
    }, []);

    // Update manual mode setting
    const setManualMode = useCallback(async (enabled: boolean): Promise<boolean> => {
        const configured = isFirebaseConfigured() && isRealtimeDatabaseConfigured();

        if (!configured) {
            // Fallback to local state only
            setSettings(prev => ({ ...prev, manualMode: enabled }));
            return true;
        }

        const database = getFirebaseDatabase();
        if (!database) {
            setSettings(prev => ({ ...prev, manualMode: enabled }));
            return true;
        }

        try {
            const manualModeRef = ref(database, 'settings/manualMode');
            await set(manualModeRef, enabled);
            console.log(`[SystemSettings] Manual mode set to: ${enabled}`);
            return true;
        } catch (err) {
            console.error('[SystemSettings] Failed to update manual mode:', err);
            setError(String(err));
            return false;
        }
    }, []);

    return (
        <SystemSettingsContext.Provider value={{ settings, isLoading, isConnected, error, setManualMode }}>
            {children}
        </SystemSettingsContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useSystemSettings(): SystemSettingsContextType {
    const context = useContext(SystemSettingsContext);
    if (!context) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
}
