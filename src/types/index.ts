// AQI Station Data
export interface AQIStation {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
    aqi: number;
    status: AQIStatus;
    pollutants: Pollutants;
    lastUpdated: string;
    type: 'government' | 'pranamesh' | 'industrial' | 'waqi';
}

export interface Pollutants {
    pm25: number;
    pm10: number;
    co: number;
    no2: number;
    so2: number;
    o3: number;
    voc?: number;
}

export type AQIStatus = 'good' | 'moderate' | 'poor' | 'unhealthy' | 'severe' | 'hazardous';

// Bus Route Data
export interface BusRoute {
    id: string;
    routeNumber: string;
    name: string;
    type: 'electric' | 'non-electric' | 'municipal';
    coordinates: [number, number][];
    currentAqi?: number;
    deviceInstalled: boolean;
}

// Historical Data
export interface HistoricalDataPoint {
    timestamp: string;
    aqi: number;
    pm25: number;
    pm10: number;
}

// Weather Data
export interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    condition: string;
}

// Chart Data Types
export interface ChartDataPoint {
    label: string;
    value: number;
}

// Device Info
export interface PranaMeshDevice {
    id: string;
    name: string;
    type: 'P-Gate' | 'P-Park' | 'P-Move' | 'P-Micro';
    description: string;
    features: string[];
    status: 'active' | 'maintenance' | 'offline';
    location?: {
        lat: number;
        lng: number;
        name: string;
    };
}

// Traffic Zone Data
export interface TrafficZone {
    id: string;
    name: string;
    area: string;
    trafficDensity: 'low' | 'medium' | 'high' | 'very-high';
    avgAqi: number;
    peakHours: string;
    recommendedDevices: number;
}

// Heatmap Cell
export interface HeatmapCell {
    hour: number;
    day: string;
    value: number;
}

// Disease Information (for health risks display)
export interface DiseaseInfo {
    name: string;
    description: string;
    riskFactor: 'low' | 'moderate' | 'high' | 'very-high' | 'severe';
    icon: string;
}

// Health Advisory (based on AQI level)
export interface HealthAdvisory {
    level: AQIStatus;
    title: string;
    description: string;
    diseases: DiseaseInfo[];
    symptoms: string[];
    atRiskGroups: string[];
    recommendations: string[];
    outdoorActivityAdvice: string;
}
