'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAqiStatus, getAqiColor } from '@/utils/aqi-utils';
import AQIChart from './AQIChart';
import TimestampBarChart from './TimestampBarChart';
import PollutantBreakdown from './PollutantBreakdown';
import StationComparison from './StationComparison';
import AnimatedNumber from './AnimatedNumber';
import { aqiStations } from '@/data/mock-data';
import {
    Clock, Calendar, Download, TrendingUp, TrendingDown,
    BarChart2, Grid3X3, BarChart3, RefreshCw, MapPin,
    GitCompare, Activity, Search, Building2, Factory, Leaf,
    ChevronDown, AlertCircle, Loader2
} from 'lucide-react';
import type { HistoricalDataPoint, HeatmapCell } from '@/types';

// Station interface matching API
interface StationInfo {
    id: string;
    name: string;
    location: string;
    type: 'government' | 'industrial' | 'pranamesh';
}

// Generate stations from mock data with type grouping
const ALL_STATIONS: StationInfo[] = aqiStations.map(station => ({
    id: station.id,
    name: station.name,
    location: station.location,
    type: station.type as 'government' | 'industrial' | 'pranamesh',
}));

// Group stations by type
const GROUPED_STATIONS = {
    pranamesh: ALL_STATIONS.filter(s => s.type === 'pranamesh'),
    government: ALL_STATIONS.filter(s => s.type === 'government'),
    industrial: ALL_STATIONS.filter(s => s.type === 'industrial'),
};

type TimeRange = '24h' | '7d' | '30d' | 'custom';
type ChartView = 'barchart' | 'heatmap';

interface HistoricalAPIResponse {
    success: boolean;
    data: HistoricalDataPoint[];
    station: string;
    range: TimeRange;
    currentAqi: number;
    lastUpdated: string;
}

// Generate heatmap data from hourly patterns
const generateHeatmapFromData = (currentAqi: number): HeatmapCell[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const HOURLY_PATTERN = [
        0.75, 0.70, 0.65, 0.63, 0.68, 0.78,
        0.88, 1.05, 1.18, 1.22, 1.15, 1.05,
        0.95, 0.90, 0.88, 0.92, 1.00, 1.15,
        1.25, 1.20, 1.10, 0.98, 0.88, 0.80,
    ];
    const DAILY_PATTERN: Record<string, number> = {
        'Sun': 0.85, 'Mon': 1.05, 'Tue': 1.08, 'Wed': 1.02, 'Thu': 1.05, 'Fri': 1.12, 'Sat': 0.90,
    };

    const data: HeatmapCell[] = [];
    days.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
            const value = Math.round(currentAqi * DAILY_PATTERN[day] * HOURLY_PATTERN[hour]);
            data.push({ hour, day, value });
        }
    });
    return data;
};

// Skeleton loader component
const SkeletonCard = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 ${className}`}>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
    </div>
);

// Station type icon component
const StationTypeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'pranamesh':
            return <Leaf className="w-4 h-4 text-green-500" />;
        case 'industrial':
            return <Factory className="w-4 h-4 text-orange-500" />;
        default:
            return <Building2 className="w-4 h-4 text-blue-500" />;
    }
};

// Format date for input
const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Get default dates (last 7 days for custom range)
const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
        startDate: formatDateForInput(start),
        endDate: formatDateForInput(end),
    };
};

const TimestampPage = () => {
    // State
    const [selectedStation, setSelectedStation] = useState('aicte-delhi');
    const [compareStation, setCompareStation] = useState('anand-vihar');
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [chartView, setChartView] = useState<ChartView>('barchart');
    const [showComparison, setShowComparison] = useState(false);
    const [stationSearch, setStationSearch] = useState('');
    const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);

    // Custom date range state
    const [customDates, setCustomDates] = useState(getDefaultDates());

    // Data states
    const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
    const [compareData, setCompareData] = useState<HistoricalDataPoint[]>([]);
    const [currentAqi, setCurrentAqi] = useState(200);
    const [compareAqi, setCompareAqi] = useState(200);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter stations based on search
    const filteredStations = useMemo(() => {
        const searchLower = stationSearch.toLowerCase();
        return {
            pranamesh: GROUPED_STATIONS.pranamesh.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.location.toLowerCase().includes(searchLower)
            ),
            government: GROUPED_STATIONS.government.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.location.toLowerCase().includes(searchLower)
            ),
            industrial: GROUPED_STATIONS.industrial.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.location.toLowerCase().includes(searchLower)
            ),
        };
    }, [stationSearch]);

    // Fetch data from API
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Build URL with custom date range if applicable
            let url = `/api/historical?station=${selectedStation}&range=${timeRange}`;
            if (timeRange === 'custom') {
                url += `&startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
            }

            // Fetch main station data
            const response = await fetch(url);
            const result: HistoricalAPIResponse = await response.json();

            if (result.success) {
                setHistoricalData(result.data);
                setCurrentAqi(result.currentAqi);
                setLastUpdated(result.lastUpdated);
            } else {
                setError('Failed to fetch data');
            }

            // Fetch comparison station data if enabled
            if (showComparison) {
                let compareUrl = `/api/historical?station=${compareStation}&range=${timeRange}`;
                if (timeRange === 'custom') {
                    compareUrl += `&startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
                }
                const compareResponse = await fetch(compareUrl);
                const compareResult: HistoricalAPIResponse = await compareResponse.json();
                if (compareResult.success) {
                    setCompareData(compareResult.data);
                    setCompareAqi(compareResult.currentAqi);
                }
            }
        } catch (err) {
            console.error('Error fetching historical data:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }, [selectedStation, compareStation, timeRange, showComparison, customDates]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchData();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.station-dropdown')) {
                setIsStationDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate stats with memoization
    const stats = useMemo(() => ({
        avgAqi: historicalData.length > 0
            ? Math.round(historicalData.reduce((a, b) => a + b.aqi, 0) / historicalData.length)
            : currentAqi,
        peakAqi: historicalData.length > 0 ? Math.max(...historicalData.map(d => d.aqi)) : currentAqi,
        minAqi: historicalData.length > 0 ? Math.min(...historicalData.map(d => d.aqi)) : currentAqi,
        dataPoints: historicalData.length,
    }), [historicalData, currentAqi]);

    // Calculate PM values from current AQI
    const pollutantData = useMemo(() => ({
        pm25: Math.round(currentAqi * 0.6),
        pm10: Math.round(currentAqi * 1.1),
        co: 1.5,
        no2: 45,
        so2: 15,
        o3: 30,
    }), [currentAqi]);

    // Generate heatmap data
    const heatmapData = useMemo(() => generateHeatmapFromData(currentAqi), [currentAqi]);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Export data as CSV
    const handleExport = useCallback(() => {
        const headers = ['Timestamp', 'AQI', 'PM2.5', 'PM10'];
        const rows = historicalData.map(d => [d.timestamp, d.aqi, d.pm25, d.pm10].join(','));
        const csv = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aqi_data_${selectedStation}_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [historicalData, selectedStation, timeRange]);

    // Get selected station name
    const selectedStationInfo = useMemo(() =>
        ALL_STATIONS.find(s => s.id === selectedStation),
        [selectedStation]
    );
    const compareStationInfo = useMemo(() =>
        ALL_STATIONS.find(s => s.id === compareStation),
        [compareStation]
    );
    const stationName = selectedStationInfo?.name || selectedStation;
    const compareStationName = compareStationInfo?.name || compareStation;

    // Handle station selection
    const handleStationSelect = (stationId: string) => {
        setSelectedStation(stationId);
        setIsStationDropdownOpen(false);
        setStationSearch('');
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 sm:py-12 md:py-16">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:gap-6 mb-8 sm:mb-12">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary-light-theme dark:text-primary" />
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1 text-text-dark dark:text-white">
                                Historical Data & Timestamps
                            </h1>
                            <p className="text-text-muted-light dark:text-text-muted text-sm sm:text-base md:text-lg">
                                Analyze pollution patterns with real-time data from {ALL_STATIONS.length} stations
                            </p>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Station Selector with Search */}
                        <div className="relative station-dropdown">
                            <button
                                onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:outline-none focus:border-primary-light-theme/50 dark:focus:border-primary/50 text-text-dark dark:text-white min-w-[180px]"
                                aria-expanded={isStationDropdownOpen}
                                aria-haspopup="listbox"
                                aria-label="Select monitoring station"
                            >
                                <MapPin className="w-4 h-4 text-text-muted-light dark:text-text-muted" />
                                <span className="flex-1 text-left truncate">{stationName}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isStationDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isStationDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl z-50">
                                    {/* Search Input */}
                                    <div className="p-3 border-b border-border-light dark:border-border-dark">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Search stations..."
                                                value={stationSearch}
                                                onChange={(e) => setStationSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:border-primary-light-theme/50 dark:focus:border-primary/50 text-text-dark dark:text-white"
                                                aria-label="Search stations"
                                            />
                                        </div>
                                    </div>

                                    {/* Station List */}
                                    <div className="max-h-72 overflow-y-auto">
                                        {/* PranaMesh Stations */}
                                        {filteredStations.pranamesh.length > 0 && (
                                            <div className="p-2">
                                                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
                                                    <Leaf className="w-3.5 h-3.5" />
                                                    PranaMesh ({filteredStations.pranamesh.length})
                                                </div>
                                                {filteredStations.pranamesh.map(station => (
                                                    <button
                                                        key={station.id}
                                                        onClick={() => handleStationSelect(station.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedStation === station.id
                                                                ? 'bg-primary-light-theme/10 dark:bg-primary/20 text-primary-light-theme dark:text-primary'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-dark dark:text-white'
                                                            }`}
                                                        role="option"
                                                        aria-selected={selectedStation === station.id}
                                                    >
                                                        <div className="font-medium">{station.name}</div>
                                                        <div className="text-xs text-text-muted-light dark:text-text-muted truncate">{station.location}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Government Stations */}
                                        {filteredStations.government.length > 0 && (
                                            <div className="p-2 border-t border-border-light dark:border-border-dark">
                                                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    Government ({filteredStations.government.length})
                                                </div>
                                                {filteredStations.government.map(station => (
                                                    <button
                                                        key={station.id}
                                                        onClick={() => handleStationSelect(station.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedStation === station.id
                                                                ? 'bg-primary-light-theme/10 dark:bg-primary/20 text-primary-light-theme dark:text-primary'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-dark dark:text-white'
                                                            }`}
                                                        role="option"
                                                        aria-selected={selectedStation === station.id}
                                                    >
                                                        <div className="font-medium">{station.name}</div>
                                                        <div className="text-xs text-text-muted-light dark:text-text-muted truncate">{station.location}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Industrial Stations */}
                                        {filteredStations.industrial.length > 0 && (
                                            <div className="p-2 border-t border-border-light dark:border-border-dark">
                                                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">
                                                    <Factory className="w-3.5 h-3.5" />
                                                    Industrial ({filteredStations.industrial.length})
                                                </div>
                                                {filteredStations.industrial.map(station => (
                                                    <button
                                                        key={station.id}
                                                        onClick={() => handleStationSelect(station.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedStation === station.id
                                                                ? 'bg-primary-light-theme/10 dark:bg-primary/20 text-primary-light-theme dark:text-primary'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-dark dark:text-white'
                                                            }`}
                                                        role="option"
                                                        aria-selected={selectedStation === station.id}
                                                    >
                                                        <div className="font-medium">{station.name}</div>
                                                        <div className="text-xs text-text-muted-light dark:text-text-muted truncate">{station.location}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* No results */}
                                        {filteredStations.pranamesh.length === 0 &&
                                            filteredStations.government.length === 0 &&
                                            filteredStations.industrial.length === 0 && (
                                                <div className="p-4 text-center text-text-muted-light dark:text-text-muted text-sm">
                                                    No stations found matching &quot;{stationSearch}&quot;
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Range Buttons */}
                        <div className="flex items-center gap-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1">
                            {(['24h', '7d', '30d', 'custom'] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${timeRange === range
                                        ? 'bg-primary-light-theme dark:bg-primary text-white'
                                        : 'text-text-muted-light dark:text-text-muted hover:text-text-dark dark:hover:text-white'
                                        }`}
                                    aria-pressed={timeRange === range}
                                >
                                    {range === 'custom' ? (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Custom</span>
                                        </span>
                                    ) : range}
                                </button>
                            ))}
                        </div>

                        {/* Compare Toggle */}
                        <button
                            onClick={() => setShowComparison(!showComparison)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${showComparison
                                ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted hover:text-text-dark dark:hover:text-white'
                                }`}
                            aria-pressed={showComparison}
                        >
                            <GitCompare className="w-4 h-4" />
                            <span className="hidden sm:inline">Compare</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                            aria-label="Refresh data"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            disabled={historicalData.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-light-theme dark:bg-primary hover:bg-primary-light-theme/90 dark:hover:bg-primary-light rounded-xl font-medium transition-colors text-white text-sm disabled:opacity-50"
                            aria-label="Export data as CSV"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Custom Date Range Picker */}
                {timeRange === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-primary-light-theme/10 dark:bg-primary/10 border border-primary-light-theme/30 dark:border-primary/30 rounded-xl">
                        <span className="text-sm font-medium text-text-dark dark:text-white">Date Range:</span>
                        <div className="flex items-center gap-2">
                            <label htmlFor="startDate" className="sr-only">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={customDates.startDate}
                                onChange={(e) => setCustomDates(prev => ({ ...prev, startDate: e.target.value }))}
                                max={customDates.endDate}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:border-primary-light-theme/50 dark:focus:border-primary/50 text-text-dark dark:text-white"
                            />
                            <span className="text-text-muted-light dark:text-text-muted">to</span>
                            <label htmlFor="endDate" className="sr-only">End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={customDates.endDate}
                                onChange={(e) => setCustomDates(prev => ({ ...prev, endDate: e.target.value }))}
                                min={customDates.startDate}
                                max={formatDateForInput(new Date())}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:border-primary-light-theme/50 dark:focus:border-primary/50 text-text-dark dark:text-white"
                            />
                        </div>
                        <span className="text-xs text-text-muted-light dark:text-text-muted">(Max 90 days)</span>
                    </div>
                )}

                {/* Compare Station Selector */}
                {showComparison && (
                    <div className="flex items-center gap-3 p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl">
                        <span className="text-sm text-pink-400">Compare with:</span>
                        <select
                            value={compareStation}
                            onChange={(e) => setCompareStation(e.target.value)}
                            className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none text-text-dark dark:text-white"
                            aria-label="Select station to compare"
                        >
                            <optgroup label="PranaMesh">
                                {GROUPED_STATIONS.pranamesh.filter(s => s.id !== selectedStation).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Government">
                                {GROUPED_STATIONS.government.filter(s => s.id !== selectedStation).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Industrial">
                                {GROUPED_STATIONS.industrial.filter(s => s.id !== selectedStation).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                )}

                {/* Station Info Badge */}
                {selectedStationInfo && (
                    <div className="flex items-center gap-2 text-sm">
                        <StationTypeIcon type={selectedStationInfo.type} />
                        <span className="text-text-muted-light dark:text-text-muted">
                            {selectedStationInfo.location}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-text-muted-light dark:text-text-muted capitalize">
                            {selectedStationInfo.type}
                        </span>
                    </div>
                )}

                {/* Last Updated */}
                {lastUpdated && (
                    <div className="text-xs text-text-muted-light dark:text-text-muted">
                        Last updated: {new Date(lastUpdated).toLocaleString('en-IN')}
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}. Using cached data.</span>
                    <button
                        onClick={fetchData}
                        className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 mb-8 sm:mb-14">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 mb-8 sm:mb-14">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <span className="text-text-muted-light dark:text-text-muted text-xs sm:text-sm">Current AQI</span>
                            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary-light-theme dark:text-primary" />
                        </div>
                        <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ color: getAqiColor(getAqiStatus(currentAqi)) }}>
                            <AnimatedNumber value={currentAqi} duration={1200} />
                        </p>
                        <p className="text-xs sm:text-sm text-text-muted-light dark:text-text-muted">{stationName}</p>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <span className="text-text-muted-light dark:text-text-muted text-xs sm:text-sm">
                                {timeRange === '24h' ? 'Today\'s Avg' : timeRange === '7d' ? '7-Day Avg' : timeRange === '30d' ? '30-Day Avg' : 'Period Avg'}
                            </span>
                            {stats.avgAqi > currentAqi ? (
                                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                            ) : (
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                            )}
                        </div>
                        <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ color: getAqiColor(getAqiStatus(stats.avgAqi)) }}>
                            <AnimatedNumber value={stats.avgAqi} duration={1200} delay={100} />
                        </p>
                        <p className={`text-xs sm:text-sm ${currentAqi > stats.avgAqi ? 'text-red-400' : 'text-green-400'}`}>
                            {currentAqi > stats.avgAqi ? '+' : ''}{currentAqi - stats.avgAqi} from avg
                        </p>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <span className="text-text-muted-light dark:text-text-muted block mb-2 sm:mb-4 text-xs sm:text-sm">Peak AQI</span>
                        <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-red-400 mb-1 sm:mb-2">
                            <AnimatedNumber value={stats.peakAqi} duration={1200} delay={200} />
                        </p>
                        <p className="text-xs sm:text-sm text-text-muted-light dark:text-text-muted">
                            {timeRange === '24h' ? 'Rush hour' : 'This period'}
                        </p>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <span className="text-text-muted-light dark:text-text-muted block mb-2 sm:mb-4 text-xs sm:text-sm">Min AQI</span>
                        <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-1 sm:mb-2">
                            <AnimatedNumber value={stats.minAqi} duration={1200} delay={300} />
                        </p>
                        <p className="text-xs sm:text-sm text-text-muted-light dark:text-text-muted">
                            {timeRange === '24h' ? 'Night hours' : 'Best day'}
                        </p>
                    </div>
                </div>
            )}

            {/* Station Comparison (when enabled) */}
            {showComparison && compareData.length > 0 && (
                <div className="mb-10 sm:mb-16">
                    <StationComparison
                        station1={{
                            name: stationName,
                            data: historicalData,
                            currentAqi: currentAqi,
                        }}
                        station2={{
                            name: compareStationName,
                            data: compareData,
                            currentAqi: compareAqi,
                        }}
                        timeRange={timeRange}
                    />
                </div>
            )}

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 mb-10 sm:mb-16">
                <AQIChart
                    data={historicalData.length > 0 ? historicalData : [{ timestamp: new Date().toISOString(), aqi: currentAqi, pm25: pollutantData.pm25, pm10: pollutantData.pm10 }]}
                    type="line"
                    title={`${timeRange === '24h' ? '24-Hour' : timeRange === '7d' ? '7-Day' : timeRange === '30d' ? '30-Day' : 'Custom'} AQI Trend (${stationName})`}
                    showPM
                />
                <PollutantBreakdown
                    data={pollutantData}
                    stationName={stationName}
                />
            </div>

            {/* Chart View Toggle Section */}
            <div className="mb-10 sm:mb-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-light-theme dark:text-indigo-400" />
                        <h2 className="text-lg sm:text-xl font-semibold text-text-dark dark:text-white">
                            {chartView === 'barchart' ? `${timeRange === '24h' ? '24-Hour' : timeRange === '7d' ? '7-Day' : timeRange === '30d' ? '30-Day' : 'Custom'} AQI Timeline` : 'Weekly AQI Heatmap'}
                        </h2>
                    </div>

                    {/* Toggle Buttons */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1">
                        <button
                            onClick={() => setChartView('barchart')}
                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${chartView === 'barchart'
                                ? 'bg-primary-light-theme dark:bg-primary text-white'
                                : 'text-text-muted-light dark:text-text-muted hover:text-text-dark dark:hover:text-white'
                                }`}
                            aria-pressed={chartView === 'barchart'}
                        >
                            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Bar Chart
                        </button>
                        <button
                            onClick={() => setChartView('heatmap')}
                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${chartView === 'heatmap'
                                ? 'bg-primary-light-theme dark:bg-primary text-white'
                                : 'text-text-muted-light dark:text-text-muted hover:text-text-dark dark:hover:text-white'
                                }`}
                            aria-pressed={chartView === 'heatmap'}
                        >
                            <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Heatmap
                        </button>
                    </div>
                </div>

                {/* Bar Chart View */}
                {chartView === 'barchart' && (
                    <TimestampBarChart
                        data={historicalData.length > 0 ? historicalData : [{ timestamp: new Date().toISOString(), aqi: currentAqi }]}
                        location={stationName}
                    />
                )}

                {/* Heatmap View */}
                {chartView === 'heatmap' && (
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-10 overflow-x-auto">
                        {/* Time Labels */}
                        <div className="flex mb-4 pl-16">
                            {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
                                <div key={hour} className="flex-1 text-center text-sm text-gray-500">
                                    {hour.toString().padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>

                        {/* Heatmap Grid */}
                        <div className="space-y-2">
                            {days.map((day) => (
                                <div key={day} className="flex items-center gap-4">
                                    <span className="w-12 text-sm text-gray-500 text-right">{day}</span>
                                    <div className="flex-1 flex gap-1">
                                        {hours.map((hour) => {
                                            const cell = heatmapData.find(c => c.day === day && c.hour === hour);
                                            const value = cell?.value || 150;
                                            const status = getAqiStatus(value);
                                            const color = getAqiColor(status);

                                            return (
                                                <div
                                                    key={`${day}-${hour}`}
                                                    className="flex-1 h-10 rounded cursor-pointer transition-transform hover:scale-110 hover:z-10 relative group shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                    title={`${day} ${hour}:00 - AQI: ${value}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`${day} ${hour}:00 - AQI: ${value}`}
                                                >
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white rounded text-sm whitespace-nowrap z-20 pointer-events-none">
                                                        {day} {hour.toString().padStart(2, '0')}:00 — AQI: {value}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-good"></span>
                                <span className="text-gray-400">Good</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-moderate"></span>
                                <span className="text-gray-400">Moderate</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-poor"></span>
                                <span className="text-gray-400">Poor</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-unhealthy"></span>
                                <span className="text-gray-400">Unhealthy</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-severe"></span>
                                <span className="text-gray-400">Severe</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-aqi-hazardous"></span>
                                <span className="text-gray-400">Hazardous</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Analysis Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-10">
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-text-dark dark:text-white">Key Insights</h3>
                    <ul className="space-y-4 sm:space-y-5 text-sm sm:text-base">
                        <li className="flex items-start gap-3 sm:gap-4">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-1.5 sm:mt-2 rounded-full bg-red-500 flex-shrink-0"></span>
                            <span className="text-text-muted-light dark:text-gray-300">Peak pollution hours: <strong>8-11 AM</strong> and <strong>5-9 PM</strong> correlating with traffic rush hours</span>
                        </li>
                        <li className="flex items-start gap-3 sm:gap-4">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-1.5 sm:mt-2 rounded-full bg-green-500 flex-shrink-0"></span>
                            <span className="text-text-muted-light dark:text-gray-300">Lowest AQI recorded during <strong>2-5 AM</strong> when traffic is minimal</span>
                        </li>
                        <li className="flex items-start gap-3 sm:gap-4">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-1.5 sm:mt-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                            <span className="text-text-muted-light dark:text-gray-300">Weekend pollution <strong>15% lower</strong> than weekdays on average</span>
                        </li>
                        <li className="flex items-start gap-3 sm:gap-4">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-1.5 sm:mt-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                            <span className="text-text-muted-light dark:text-gray-300">Industrial zones (Mundka, Narela) consistently <strong>40% higher</strong> than residential areas</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-10">
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-text-dark dark:text-white">PranaMesh Impact</h3>
                    <div className="space-y-4 sm:space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-text-muted-light dark:text-gray-400">PM2.5 Reduction (near device)</span>
                                <span className="text-green-400 font-semibold">-45%</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-text-muted-light dark:text-gray-400">Clean Air Zone Coverage</span>
                                <span className="text-indigo-400 font-semibold">3m radius</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-text-muted-light dark:text-gray-400">Data Points Collected</span>
                                <span className="text-amber-400 font-semibold">{stats.dataPoints > 0 ? stats.dataPoints.toLocaleString() : '12,480'}/day</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimestampPage;
