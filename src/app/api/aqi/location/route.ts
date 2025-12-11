import { NextResponse } from 'next/server';
import { fetchAQIByLocation } from '@/lib/waqi-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/aqi/location
 * Fetches AQI data for a specific geographic location
 * Query params: lat (latitude), lng (longitude)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json(
                { success: false, error: 'Invalid coordinates. lat and lng are required.' },
                { status: 400 }
            );
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json(
                { success: false, error: 'Coordinates out of range.' },
                { status: 400 }
            );
        }

        const data = await fetchAQIByLocation(lat, lng);

        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Could not fetch AQI data for this location',
                    fallback: {
                        aqi: 245,
                        pm25: 168,
                        pm10: 285,
                        cityName: 'Unknown Location',
                    }
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            aqi: data.aqi,
            pm25: data.pm25,
            pm10: data.pm10,
            temperature: data.temperature,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            cityName: data.cityName,
            lastUpdated: data.lastUpdated,
            coordinates: { lat, lng },
        });
    } catch (error) {
        console.error('Location AQI API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
