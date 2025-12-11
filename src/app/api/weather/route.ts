import { NextResponse } from 'next/server';
import { fetchWAQIData } from '@/lib/waqi-api';
import { getScrapedData } from '@/lib/aqi-service';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 1 minute

// CORS headers for API responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// AccuWeather API configuration
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;
const DELHI_LOCATION_KEY = '202396'; // Delhi, India location key for AccuWeather

interface AccuWeatherCondition {
    LocalObservationDateTime: string;
    WeatherText: string;
    WeatherIcon: number;
    IsDayTime: boolean;
    Temperature: {
        Metric: { Value: number; Unit: string };
        Imperial: { Value: number; Unit: string };
    };
    RelativeHumidity: number;
    Wind: {
        Speed: { Metric: { Value: number; Unit: string } };
        Direction: { Degrees: number; English: string };
    };
    UVIndex: number;
    UVIndexText: string;
    Visibility: { Metric: { Value: number; Unit: string } };
    Pressure: { Metric: { Value: number; Unit: string } };
    RealFeelTemperature: {
        Metric: { Value: number };
    };
}

/**
 * Fetch weather data from AccuWeather API
 */
async function fetchAccuWeather(): Promise<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    uvIndexText: string;
    weatherText: string;
    weatherIcon: number;
    isDayTime: boolean;
    feelsLike: number;
    visibility: number;
    pressure: number;
    windDirection: string;
} | null> {
    try {
        const response = await fetch(
            `https://dataservice.accuweather.com/currentconditions/v1/${DELHI_LOCATION_KEY}?apikey=${ACCUWEATHER_API_KEY}&details=true`,
            { next: { revalidate: 300 } } // Cache for 5 minutes
        );

        if (!response.ok) {
            console.error('AccuWeather API error:', response.status, response.statusText);
            return null;
        }

        const data: AccuWeatherCondition[] = await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        const current = data[0];

        return {
            temperature: Math.round(current.Temperature.Metric.Value),
            humidity: current.RelativeHumidity,
            windSpeed: Math.round(current.Wind.Speed.Metric.Value),
            uvIndex: current.UVIndex,
            uvIndexText: current.UVIndexText,
            weatherText: current.WeatherText,
            weatherIcon: current.WeatherIcon,
            isDayTime: current.IsDayTime,
            feelsLike: Math.round(current.RealFeelTemperature.Metric.Value),
            visibility: current.Visibility.Metric.Value,
            pressure: current.Pressure.Metric.Value,
            windDirection: current.Wind.Direction.English,
        };
    } catch (error) {
        console.error('AccuWeather fetch error:', error);
        return null;
    }
}

/**
 * GET /api/weather
 * Returns real-time weather data from AccuWeather API (primary) or WAQI (fallback)
 */
export async function GET() {
    try {
        // Try AccuWeather API first (most accurate)
        const accuWeatherData = await fetchAccuWeather();

        if (accuWeatherData) {
            return NextResponse.json(
                {
                    success: true,
                    source: 'accuweather',
                    temperature: accuWeatherData.temperature,
                    humidity: accuWeatherData.humidity,
                    windSpeed: accuWeatherData.windSpeed,
                    uvIndex: accuWeatherData.uvIndex,
                    uvIndexText: accuWeatherData.uvIndexText,
                    weatherText: accuWeatherData.weatherText,
                    weatherIcon: accuWeatherData.weatherIcon,
                    isDayTime: accuWeatherData.isDayTime,
                    feelsLike: accuWeatherData.feelsLike,
                    visibility: accuWeatherData.visibility,
                    pressure: accuWeatherData.pressure,
                    windDirection: accuWeatherData.windDirection,
                    lastUpdated: new Date().toISOString(),
                },
                { headers: corsHeaders }
            );
        }

        // Fallback to WAQI API
        const waqiData = await fetchWAQIData();

        if (waqiData) {
            return NextResponse.json(
                {
                    success: true,
                    source: 'waqi',
                    temperature: waqiData.temperature,
                    humidity: waqiData.humidity,
                    windSpeed: waqiData.windSpeed,
                    pressure: waqiData.pressure,
                    lastUpdated: waqiData.lastUpdated,
                },
                { headers: corsHeaders }
            );
        }

        // Fallback to scraped data
        const scrapedData = await getScrapedData();

        if (scrapedData) {
            return NextResponse.json(
                {
                    success: true,
                    source: 'scraped',
                    temperature: scrapedData.temperature,
                    humidity: scrapedData.humidity,
                    windSpeed: scrapedData.windSpeed,
                    lastUpdated: scrapedData.lastUpdated,
                },
                { headers: corsHeaders }
            );
        }

        // Fallback to static data
        return NextResponse.json(
            {
                success: true,
                source: 'fallback',
                temperature: 20,
                humidity: 50,
                windSpeed: 5,
                lastUpdated: new Date().toISOString(),
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error('Weather API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch weather data',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

