'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Upload, AlertCircle, CheckCircle, Loader2, Plus, RefreshCw, Database, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { updateAQIData, saveStationMetadata, getAllStations } from '@/lib/firestore-aqi-service';
import { initializeSampleData } from '@/lib/firebase-aqi-service';
import { isFirebaseConfigured, getFirebaseDatabase } from '@/lib/firebase';
import { useSystemSettings } from '@/lib/SystemSettingsContext';
import { aqiStations as mockStations } from '@/data/mock-data';
import { ref, set } from 'firebase/database';

interface StationFormData {
    stationId: string;
    stationName: string;
    location: string;
    lat: string;
    lng: string;
    aqi: string;
    pm25: string;
    pm10: string;
    co: string;
    no2: string;
    so2: string;
    o3: string;
    source: 'manual' | 'sensor' | 'api';
    notes: string;
}

const initialFormData: StationFormData = {
    stationId: '',
    stationName: '',
    location: '',
    lat: '',
    lng: '',
    aqi: '',
    pm25: '',
    pm10: '',
    co: '',
    no2: '',
    so2: '',
    o3: '',
    source: 'manual',
    notes: '',
};

interface SubmissionResult {
    success: boolean;
    message: string;
    timestamp?: string;
}

interface StationOption {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
    type: string;
    currentAqi?: number;
    pollutants?: {
        pm25?: number;
        pm10?: number;
        co?: number;
        no2?: number;
        so2?: number;
        o3?: number;
    };
}

// Manual Mode Toggle Component
function ManualModeToggle() {
    const { settings, isLoading, setManualMode } = useSystemSettings();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleToggle = async () => {
        setIsUpdating(true);
        await setManualMode(!settings.manualMode);
        setIsUpdating(false);
    };

    return (
        <div className={`mb-6 p-5 rounded-xl border-2 transition-all ${settings.manualMode
            ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20'
            : 'bg-green-500/10 border-green-500/50 dark:bg-green-500/20'
            }`}>
            <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${settings.manualMode ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
                        {settings.manualMode ? (
                            <ToggleRight className="w-6 h-6 text-amber-500" />
                        ) : (
                            <ToggleLeft className="w-6 h-6 text-green-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-dark dark:text-text-light flex items-center gap-2">
                            Manual Mode
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        </h3>
                        <p className="text-sm text-text-muted-light dark:text-text-muted mt-1">
                            {settings.manualMode ? (
                                <>
                                    <span className="font-medium text-amber-600 dark:text-amber-400">Active:</span> Website displays Firebase data from your hardware sensors
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-green-600 dark:text-green-400">Inactive:</span> Website displays accurate real-time WAQI API data
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={isLoading || isUpdating}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 ${settings.manualMode
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                >
                    {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : settings.manualMode ? (
                        <ToggleRight className="w-4 h-4" />
                    ) : (
                        <ToggleLeft className="w-4 h-4" />
                    )}
                    {settings.manualMode ? 'Turn OFF' : 'Turn ON'}
                </button>
            </div>

            {/* Info box */}
            <div className="mt-4 p-3 rounded-lg bg-black/5 dark:bg-white/5 flex items-start gap-2">
                <Info className="w-4 h-4 text-text-muted-light dark:text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-muted-light dark:text-text-muted">
                    {settings.manualMode ? (
                        <>
                            Data entered via this admin panel will be displayed across all pages.
                            Toggle OFF to show accurate real-time AQI data from official sources.
                        </>
                    ) : (
                        <>
                            The website is showing live AQI data from the WAQI API.
                            Toggle ON to use data from your hardware sensors or manual entries.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

export default function AQIDataEntry() {
    const [formData, setFormData] = useState<StationFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [existingStations, setExistingStations] = useState<StationOption[]>([]);
    const [isNewStation, setIsNewStation] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isLoadingStations, setIsLoadingStations] = useState(true);
    const [isInitializingDB, setIsInitializingDB] = useState(false);

    // Direct test write to Realtime Database
    const handleInitializeRealtimeDB = async () => {
        setIsInitializingDB(true);
        setResult(null);

        console.log('[Admin] Starting direct Realtime Database test...');

        try {
            const database = getFirebaseDatabase();
            console.log('[Admin] Database instance:', database);

            if (!database) {
                setResult({ success: false, message: 'Could not get Realtime Database instance' });
                setIsInitializingDB(false);
                return;
            }

            // Try a simple direct write
            const testRef = ref(database, 'test');
            console.log('[Admin] Writing test data...');
            await set(testRef, {
                message: 'Test write successful',
                timestamp: new Date().toISOString()
            });
            console.log('[Admin] [OK] Test write successful!');

            // Now initialize all stations
            console.log('[Admin] Initializing all stations...');
            const success = await initializeSampleData(mockStations);

            if (success) {
                setResult({ success: true, message: `Realtime Database initialized with ${mockStations.length} stations!` });
            } else {
                setResult({ success: false, message: 'Failed to initialize stations' });
            }
        } catch (error) {
            console.error('[Admin] [ERROR] Error:', error);
            setResult({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
        }

        setIsInitializingDB(false);
    };

    // Check Firebase configuration and load stations
    useEffect(() => {
        const configured = isFirebaseConfigured();
        setIsConfigured(configured);
        loadStations(configured);
    }, []);

    const loadStations = async (firebaseConfigured: boolean) => {
        setIsLoadingStations(true);
        console.log('[Admin] loadStations called, firebaseConfigured:', firebaseConfigured);

        // Start with mock stations (always available)
        const stationMap = new Map<string, StationOption>();

        // Add all mock stations first
        console.log('[Admin] Loading mock stations, count:', mockStations.length);
        mockStations.forEach(station => {
            stationMap.set(station.id, {
                id: station.id,
                name: station.name,
                location: station.location,
                lat: station.lat,
                lng: station.lng,
                type: station.type,
                currentAqi: station.aqi,
                pollutants: station.pollutants,
            });
        });

        // If Firebase is configured, also fetch Firebase stations and merge
        if (firebaseConfigured) {
            console.log('[Admin] Fetching Firebase stations...');
            const result = await getAllStations();
            console.log('[Admin] Firebase stations result:', result);
            if (result.success && result.data) {
                result.data.forEach(station => {
                    stationMap.set(station.id, {
                        id: station.id,
                        name: station.name,
                        location: station.location,
                        lat: station.lat,
                        lng: station.lng,
                        type: station.type,
                    });
                });
            }
        }

        // Convert map to array and sort by name
        const stations = Array.from(stationMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        console.log('[Admin] Final stations loaded:', stations.length);
        setExistingStations(stations);
        setIsLoadingStations(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setResult(null);
    };

    const handleStationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === '__new__') {
            setIsNewStation(true);
            setFormData(initialFormData);
        } else {
            setIsNewStation(false);
            const station = existingStations.find(s => s.id === value);
            if (station) {
                setFormData({
                    stationId: station.id,
                    stationName: station.name,
                    location: station.location,
                    lat: String(station.lat),
                    lng: String(station.lng),
                    aqi: station.currentAqi ? String(station.currentAqi) : '',
                    pm25: station.pollutants?.pm25 ? String(station.pollutants.pm25) : '',
                    pm10: station.pollutants?.pm10 ? String(station.pollutants.pm10) : '',
                    co: station.pollutants?.co ? String(station.pollutants.co) : '',
                    no2: station.pollutants?.no2 ? String(station.pollutants.no2) : '',
                    so2: station.pollutants?.so2 ? String(station.pollutants.so2) : '',
                    o3: station.pollutants?.o3 ? String(station.pollutants.o3) : '',
                    source: 'manual',
                    notes: '',
                });
            }
        }
        setResult(null);
    };

    const validateForm = (): string | null => {
        if (!formData.stationId && !isNewStation) {
            return 'Please select or create a station';
        }
        if (isNewStation && (!formData.stationId || !formData.stationName)) {
            return 'Station ID and name are required for new stations';
        }
        if (!formData.aqi || isNaN(Number(formData.aqi))) {
            return 'Valid AQI value is required';
        }
        if (!formData.pm25 || isNaN(Number(formData.pm25))) {
            return 'Valid PM2.5 value is required';
        }
        if (!formData.pm10 || isNaN(Number(formData.pm10))) {
            return 'Valid PM10 value is required';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setResult({ success: false, message: validationError });
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            // If new station, save metadata first
            if (isNewStation) {
                const lat = parseFloat(formData.lat) || 28.6139;
                const lng = parseFloat(formData.lng) || 77.2090;

                const metadataResult = await saveStationMetadata({
                    id: formData.stationId,
                    name: formData.stationName,
                    location: formData.location || 'Delhi, India',
                    lat,
                    lng,
                    type: 'pranamesh',
                    isActive: true,
                });

                if (!metadataResult.success) {
                    setResult({ success: false, message: `Failed to create station: ${metadataResult.error}` });
                    setIsSubmitting(false);
                    return;
                }
            }

            // Submit AQI reading with UI-side timeout safety (15s)
            // This ensures that even if the service layer hangs, the UI will eventually recover
            const timeoutPromise = new Promise<SubmissionResult>((_, reject) => {
                setTimeout(() => reject(new Error('Submission timed out. Please check your connection.')), 15000);
            });

            const submissionPromise = updateAQIData(formData.stationId, {
                aqi: parseInt(formData.aqi),
                pollutants: {
                    pm25: parseFloat(formData.pm25),
                    pm10: parseFloat(formData.pm10),
                    co: parseFloat(formData.co) || 0,
                    no2: parseFloat(formData.no2) || 0,
                    so2: parseFloat(formData.so2) || 0,
                    o3: parseFloat(formData.o3) || 0,
                },
                source: formData.source,
                metadata: formData.notes ? { notes: formData.notes } : undefined,
            }).then(readingResult => {
                if (readingResult.success) {
                    return {
                        success: true,
                        message: 'AQI data submitted successfully!',
                        timestamp: readingResult.data?.timestamp.toISOString(),
                    } as SubmissionResult;
                } else {
                    throw new Error(readingResult.error || 'Unknown error');
                }
            });

            const result = await Promise.race([submissionPromise, timeoutPromise]);

            if (result.success) {
                setResult(result);

                // Reload stations if new one was added
                if (isNewStation) {
                    await loadStations(isConfigured);
                    setIsNewStation(false);
                }

                // Reset form (keep station selected)
                setFormData(prev => ({
                    ...initialFormData,
                    stationId: prev.stationId,
                    stationName: prev.stationName,
                }));
            }
        } catch (error) {
            console.error('Submission error:', error);
            setResult({ success: false, message: `Failed to submit: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAQIColor = (aqi: number): string => {
        if (aqi <= 50) return '#00e400';
        if (aqi <= 100) return '#ffff00';
        if (aqi <= 150) return '#ff7e00';
        if (aqi <= 200) return '#ff0000';
        if (aqi <= 300) return '#8f3f97';
        return '#7e0023';
    };

    // Show warning banner if Firebase not configured, but still allow form access
    const firebaseWarning = !isConfigured ? (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/50">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-amber-600 dark:text-amber-400">Firebase Not Configured</h3>
                    <p className="text-sm text-text-muted-light dark:text-text-muted mt-1">
                        Firebase environment variables are missing. Data submissions may not be persisted.
                        Check your <code className="bg-black/10 dark:bg-white/10 px-1 rounded">.env.local</code> file or restart the dev server.
                    </p>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
                <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20">
                    <BarChart3 className="w-6 h-6 text-primary-light-theme dark:text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-text-dark dark:text-text-light">AQI Data Entry</h1>
                    <p className="text-sm text-text-muted-light dark:text-text-muted">Submit air quality readings to Firebase</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleInitializeRealtimeDB}
                        disabled={isInitializingDB}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        title="Initialize Realtime Database with all stations"
                    >
                        {isInitializingDB ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Database className="w-4 h-4" />
                        )}
                        Init DB
                    </button>
                    <button
                        type="button"
                        onClick={() => loadStations(isConfigured)}
                        disabled={isLoadingStations}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Refresh stations"
                    >
                        <RefreshCw className={`w-5 h-5 text-text-muted-light dark:text-text-muted ${isLoadingStations ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Firebase Warning (if not configured) */}
            {firebaseWarning}

            {/* Manual Mode Toggle */}
            <ManualModeToggle />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Station Selection */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-text-dark dark:text-text-light mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-light-theme dark:bg-primary text-white flex items-center justify-center text-xs">1</span>
                        Station
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Select Station</label>
                            <select
                                value={isNewStation ? '__new__' : formData.stationId}
                                onChange={handleStationSelect}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light focus:outline-none focus:border-primary-light-theme dark:focus:border-primary transition-colors"
                            >
                                <option value="">-- Select Station --</option>
                                {existingStations.map(station => (
                                    <option key={station.id} value={station.id}>
                                        {station.name}
                                    </option>
                                ))}
                                <option value="__new__">+ Add New Station</option>
                            </select>
                        </div>

                        {isNewStation && (
                            <div className="pt-4 border-t border-dashed border-border-light dark:border-border-dark space-y-4">
                                <div className="flex items-center gap-2 text-sm text-primary-light-theme dark:text-primary mb-2">
                                    <Plus className="w-4 h-4" />
                                    <span>New Station Details</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Station ID *</label>
                                        <input
                                            type="text"
                                            name="stationId"
                                            value={formData.stationId}
                                            onChange={handleInputChange}
                                            placeholder="e.g., station-001"
                                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Station Name *</label>
                                        <input
                                            type="text"
                                            name="stationName"
                                            value={formData.stationName}
                                            onChange={handleInputChange}
                                            placeholder="e.g., ITO Junction"
                                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder="e.g., New Delhi, India"
                                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Latitude</label>
                                        <input
                                            type="number"
                                            name="lat"
                                            value={formData.lat}
                                            onChange={handleInputChange}
                                            placeholder="28.6139"
                                            step="0.0001"
                                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Longitude</label>
                                        <input
                                            type="number"
                                            name="lng"
                                            value={formData.lng}
                                            onChange={handleInputChange}
                                            placeholder="77.2090"
                                            step="0.0001"
                                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AQI Reading */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-text-dark dark:text-text-light mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-light-theme dark:bg-primary text-white flex items-center justify-center text-xs">2</span>
                        AQI Reading
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">AQI Value *</label>
                            <input
                                type="number"
                                name="aqi"
                                value={formData.aqi}
                                onChange={handleInputChange}
                                placeholder="0-500"
                                min="0"
                                max="500"
                                className="w-full px-4 py-4 bg-background-light dark:bg-background-dark border-2 rounded-lg text-2xl font-bold text-center text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none transition-all"
                                style={{
                                    borderColor: formData.aqi ? getAQIColor(parseInt(formData.aqi)) : 'var(--color-border-dark)',
                                    boxShadow: formData.aqi ? `0 0 20px ${getAQIColor(parseInt(formData.aqi))}30` : 'none',
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Source</label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleInputChange}
                                className="w-full px-4 py-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            >
                                <option value="manual">Manual Entry</option>
                                <option value="sensor">Sensor Device</option>
                                <option value="api">External API</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Pollutants */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-text-dark dark:text-text-light mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-light-theme dark:bg-primary text-white flex items-center justify-center text-xs">3</span>
                        Pollutant Levels
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">PM2.5 (μg/m³) *</label>
                            <input
                                type="number"
                                name="pm25"
                                value={formData.pm25}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">PM10 (μg/m³) *</label>
                            <input
                                type="number"
                                name="pm10"
                                value={formData.pm10}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">CO (mg/m³)</label>
                            <input
                                type="number"
                                name="co"
                                value={formData.co}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">NO₂ (μg/m³)</label>
                            <input
                                type="number"
                                name="no2"
                                value={formData.no2}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">SO₂ (μg/m³)</label>
                            <input
                                type="number"
                                name="so2"
                                value={formData.so2}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">O₃ (μg/m³)</label>
                            <input
                                type="number"
                                name="o3"
                                value={formData.o3}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-text-dark dark:text-text-light mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-light-theme dark:bg-primary text-white flex items-center justify-center text-xs">4</span>
                        Additional Info
                    </h3>
                    <div>
                        <label className="block text-sm text-text-muted-light dark:text-text-muted mb-2">Notes (optional)</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Any additional observations..."
                            rows={3}
                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary resize-none"
                        />
                    </div>
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.success
                        ? 'bg-aqi-good/10 border-aqi-good/30 text-aqi-good'
                        : 'bg-aqi-unhealthy/10 border-aqi-unhealthy/30 text-aqi-unhealthy'
                        }`}>
                        {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="flex-1">{result.message}</span>
                        {result.timestamp && (
                            <span className="text-sm opacity-70">
                                {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-light-theme to-primary-light-light-theme dark:from-primary dark:to-warm-orange text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            Submit AQI Data
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
