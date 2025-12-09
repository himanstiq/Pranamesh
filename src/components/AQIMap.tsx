'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView, Polygon, Polyline, InfoWindow, Marker } from '@react-google-maps/api';
import type { AQIStation, BusRoute } from '@/types';
import { getAqiStatus, getAqiColor, getAqiLabel } from '@/utils/aqi-utils';
import { delhiBoundary, ncrBoundary } from '@/data/boundaries';
import { getHealthAdvisory, getTopDiseasesForAQI } from '@/data/disease-data';
import { MapPin, Clock, Bus } from 'lucide-react';

// Bus position type for real-time tracking
export interface BusPosition {
    id: string;
    vehicleId: string;
    routeId: string;
    routeNumber: string;
    lat: number;
    lng: number;
    bearing: number;
    speed: number;
    timestamp: string;
    type: 'electric' | 'non-electric' | 'municipal';
}

interface AQIMapProps {
    stations: AQIStation[];
    busRoutes: BusRoute[];
    busPositions?: BusPosition[];
    viewMode: 'aqi' | 'electric' | 'non-electric' | 'municipal' | 'all-routes';
    focusStation?: string;
    onStationSelect?: (station: AQIStation | null) => void;
    selectedStationId?: string;
}

// Convert [lat, lng] to {lat, lng} format for Google Maps
const convertCoords = (coords: [number, number][]): { lat: number; lng: number }[] => {
    return coords.map(([lat, lng]) => ({ lat, lng }));
};

// Light map styles for AQI display - clean and readable
const lightMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e9e9e9' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: 28.6139,
    lng: 77.2090,
};

// Custom AQI Marker Component - Memoized for performance
const AQIMarker = React.memo(({
    station,
    onClick,
    isSelected
}: {
    station: AQIStation;
    onClick: () => void;
    isSelected: boolean;
}) => {
    const status = getAqiStatus(station.aqi);
    const color = getAqiColor(status);

    // Determine size based on AQI severity
    const getMarkerSize = () => {
        if (isSelected) return 48;
        if (station.aqi >= 300) return 42;
        if (station.aqi >= 200) return 38;
        return 34;
    };

    const size = getMarkerSize();
    const fontSize = size > 40 ? 13 : 11;

    return (
        <OverlayView
            position={{ lat: station.lat, lng: station.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
            <div
                onClick={onClick}
                className="relative cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110"
                style={{ zIndex: isSelected ? 1000 : station.aqi }}
            >
                {/* Main circle */}
                <div
                    className="rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                    style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        fontSize: fontSize,
                        border: isSelected ? '3px solid white' : 'none',
                        boxShadow: `0 0 ${isSelected ? 20 : 10}px ${color}80`,
                    }}
                >
                    {station.aqi}
                </div>
                {/* Pulse animation for selected */}
                {isSelected && (
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ backgroundColor: color, opacity: 0.3 }}
                    />
                )}
            </div>
        </OverlayView>
    );
});

// Set display name for the memoized component
AQIMarker.displayName = 'AQIMarker';

const AQIMap = ({
    stations,
    busRoutes,
    busPositions = [],
    viewMode,
    focusStation,
    onStationSelect,
    selectedStationId
}: AQIMapProps) => {
    const [selectedStation, setSelectedStation] = useState<AQIStation | null>(null);
    const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
    const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    // Handle external station selection
    useEffect(() => {
        if (selectedStationId) {
            const station = stations.find(s => s.id === selectedStationId);
            if (station) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync local state with prop
                setSelectedStation(station);
                if (mapRef.current) {
                    mapRef.current.panTo({ lat: station.lat, lng: station.lng });
                    mapRef.current.setZoom(13);
                }
            }
        }
    }, [selectedStationId, stations]);

    const getRouteColor = (type: BusRoute['type']) => {
        switch (type) {
            case 'electric': return '#10b981';
            case 'non-electric': return '#f59e0b';
            case 'municipal': return '#6366f1';
            default: return '#6b7280';
        }
    };

    const filteredRoutes = useMemo(() => {
        return busRoutes.filter(route => {
            if (viewMode === 'all-routes') return true;
            if (viewMode === 'aqi') return false;
            return route.type === viewMode;
        });
    }, [busRoutes, viewMode]);

    const delhiPath = useMemo(() => convertCoords(delhiBoundary), []);
    const ncrPath = useMemo(() => convertCoords(ncrBoundary), []);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        // Set bounds to Delhi region
        const bounds = new google.maps.LatLngBounds(
            { lat: 28.35, lng: 76.9 },
            { lat: 28.9, lng: 77.45 }
        );
        map.fitBounds(bounds);
    }, []);

    const handleStationClick = (station: AQIStation) => {
        setSelectedStation(station);
        if (onStationSelect) {
            onStationSelect(station);
        }
    };

    if (loadError) {
        return (
            <div className="w-full h-full bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                <div className="text-center text-red-500">
                    <p className="text-lg font-semibold">Error loading Google Maps</p>
                    <p className="text-sm opacity-80">Please check your API key configuration</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-full bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={11}
            onLoad={onLoad}
            options={{
                styles: lightMapStyles,
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER,
                },
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                minZoom: 9,
                maxZoom: 18,
                restriction: {
                    latLngBounds: {
                        north: 29.2,
                        south: 27.9,
                        east: 77.9,
                        west: 76.4,
                    },
                    strictBounds: true,
                },
            }}
        >
            {/* NCR Region Boundary (outer, subtle) */}
            <Polygon
                paths={ncrPath}
                options={{
                    strokeColor: '#cccccc',
                    strokeWeight: 1,
                    strokeOpacity: 0.5,
                    fillColor: '#f0f0f0',
                    fillOpacity: 0.1,
                }}
            />

            {/* Delhi State Boundary - visible on light map */}
            <Polygon
                paths={delhiPath}
                options={{
                    strokeColor: '#3388ff',
                    strokeWeight: 3,
                    strokeOpacity: 1,
                    fillColor: '#3388ff',
                    fillOpacity: 0.2,
                }}
            />

            {/* Bus Routes */}
            {viewMode !== 'aqi' && filteredRoutes.map((route) => (
                <Polyline
                    key={route.id}
                    path={convertCoords(route.coordinates)}
                    options={{
                        strokeColor: getRouteColor(route.type),
                        strokeWeight: 5,
                        strokeOpacity: 0.85,
                        icons: route.deviceInstalled ? undefined : [{
                            icon: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 1,
                                scale: 4,
                            },
                            offset: '0',
                            repeat: '20px',
                        }],
                    }}
                    onClick={() => setSelectedRoute(route)}
                />
            ))}

            {/* Route Info Window */}
            {selectedRoute && (
                <InfoWindow
                    position={convertCoords(selectedRoute.coordinates)[Math.floor(selectedRoute.coordinates.length / 2)]}
                    onCloseClick={() => setSelectedRoute(null)}
                >
                    <div className="min-w-[200px] p-2 text-gray-900">
                        <h3 className="font-bold text-lg">{selectedRoute.routeNumber}</h3>
                        <p className="text-sm opacity-80">{selectedRoute.name}</p>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs">Type: <span className="font-semibold capitalize">{selectedRoute.type}</span></p>
                        </div>
                    </div>
                </InfoWindow>
            )}

            {/* Real-time Bus Position Markers */}
            {viewMode !== 'aqi' && busPositions.map((bus) => (
                <Marker
                    key={bus.id}
                    position={{ lat: bus.lat, lng: bus.lng }}
                    onClick={() => setSelectedBus(bus)}
                    icon={{
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 5,
                        rotation: bus.bearing,
                        fillColor: getRouteColor(bus.type),
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    }}
                />
            ))}

            {/* Bus Info Window */}
            {selectedBus && (
                <InfoWindow
                    position={{ lat: selectedBus.lat, lng: selectedBus.lng }}
                    onCloseClick={() => setSelectedBus(null)}
                >
                    <div className="min-w-[180px] p-2 text-gray-900">
                        <h3 className="font-bold text-lg flex items-center gap-1.5">
                            <Bus className="w-4 h-4 text-gray-700" /> {selectedBus.routeNumber}
                        </h3>
                        <p className="text-sm opacity-80">Vehicle: {selectedBus.vehicleId}</p>
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                            <p className="text-xs">Speed: <span className="font-semibold">{Math.round(selectedBus.speed)} km/h</span></p>
                            <p className="text-xs">Type: <span className="font-semibold capitalize">{selectedBus.type}</span></p>
                        </div>
                    </div>
                </InfoWindow>
            )}

            {/* Custom AQI Station Markers with values inside */}
            {stations.map((station) => (
                <AQIMarker
                    key={station.id}
                    station={station}
                    onClick={() => handleStationClick(station)}
                    isSelected={selectedStation?.id === station.id || focusStation === station.id}
                />
            ))}

            {/* Station Info Window */}
            {selectedStation && (
                <InfoWindow
                    position={{ lat: selectedStation.lat, lng: selectedStation.lng }}
                    onCloseClick={() => {
                        setSelectedStation(null);
                        if (onStationSelect) onStationSelect(null);
                    }}
                    options={{
                        pixelOffset: new google.maps.Size(0, -25),
                    }}
                >
                    {(() => {
                        const healthAdvisory = getHealthAdvisory(selectedStation.aqi);
                        const topDiseases = getTopDiseasesForAQI(selectedStation.aqi, 3);
                        return (
                            <div className="min-w-[280px] max-w-[320px] p-3 text-gray-900">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-lg">{selectedStation.name}</h3>
                                    <span
                                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                        style={{ backgroundColor: getAqiColor(getAqiStatus(selectedStation.aqi)) }}
                                    >
                                        {selectedStation.aqi}
                                    </span>
                                </div>
                                <p className="text-sm opacity-80 mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />{selectedStation.location}
                                </p>
                                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                    <p className="text-xs">
                                        Status: <span className="font-semibold" style={{ color: getAqiColor(getAqiStatus(selectedStation.aqi)) }}>
                                            {getAqiLabel(getAqiStatus(selectedStation.aqi))}
                                        </span>
                                    </p>
                                    <p className="text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />Updated: {new Date(selectedStation.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                {/* Pollutants */}
                                <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs text-center">
                                    <div>
                                        <p className="font-bold">{selectedStation.pollutants.pm25}</p>
                                        <p className="opacity-60">PM2.5</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{selectedStation.pollutants.pm10}</p>
                                        <p className="opacity-60">PM10</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{selectedStation.pollutants.no2}</p>
                                        <p className="opacity-60">NO₂</p>
                                    </div>
                                </div>

                                {/* Health Risks Section */}
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-red-700 mb-1">Health Risks</p>
                                    <div className="space-y-1">
                                        {topDiseases.map((disease, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                                                <span className="font-medium">{disease.name}</span>
                                                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${disease.riskFactor === 'severe' ? 'bg-red-100 text-red-700' :
                                                    disease.riskFactor === 'very-high' ? 'bg-orange-100 text-orange-700' :
                                                        disease.riskFactor === 'high' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {disease.riskFactor}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Health Advisory */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold mb-1">Advisory</p>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {healthAdvisory.outdoorActivityAdvice}
                                    </p>
                                    {healthAdvisory.recommendations.length > 0 && (
                                        <ul className="mt-1 text-[10px] text-gray-500 space-y-0.5">
                                            {healthAdvisory.recommendations.slice(0, 2).map((rec, idx) => (
                                                <li key={idx}>• {rec}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {selectedStation.aqi > 100 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-orange-700 mb-1">At-Risk Groups</p>
                                        <p className="text-[10px] text-gray-600">
                                            {healthAdvisory.atRiskGroups.slice(0, 2).join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                </InfoWindow>
            )}
        </GoogleMap>
    );
};

export default AQIMap;
