import { NextRequest, NextResponse } from 'next/server';

/**
 * AQI Update API Route
 * 
 * This route accepts AQI data and returns it for client-side Firebase processing.
 * For full server-side Firebase Admin SDK, you would need to:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Create a service account and download the JSON key
 * 3. Set FIREBASE_ADMIN_CREDENTIALS environment variable
 * 
 * For now, this validates data and returns it for client-side handling.
 */

interface AQIUpdateRequest {
    stationId: string;
    aqi: number;
    pollutants: {
        pm25: number;
        pm10: number;
        co?: number;
        no2?: number;
        so2?: number;
        o3?: number;
    };
    source?: 'manual' | 'sensor' | 'api';
    metadata?: {
        deviceId?: string;
        operatorId?: string;
        notes?: string;
    };
}

interface BatchUpdateRequest {
    readings: AQIUpdateRequest[];
}

/**
 * Validate AQI update request
 */
function validateReading(data: AQIUpdateRequest): string | null {
    if (!data.stationId || typeof data.stationId !== 'string') {
        return 'stationId is required and must be a string';
    }
    if (typeof data.aqi !== 'number' || data.aqi < 0 || data.aqi > 500) {
        return 'aqi must be a number between 0 and 500';
    }
    if (!data.pollutants || typeof data.pollutants !== 'object') {
        return 'pollutants object is required';
    }
    if (typeof data.pollutants.pm25 !== 'number') {
        return 'pollutants.pm25 is required';
    }
    if (typeof data.pollutants.pm10 !== 'number') {
        return 'pollutants.pm10 is required';
    }
    return null;
}

/**
 * POST /api/firebase - Validate and process AQI data
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Optional API key validation
        const apiKey = request.headers.get('x-api-key');
        const expectedKey = process.env.AQI_UPDATE_API_KEY;

        if (expectedKey && apiKey !== expectedKey) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Invalid API key' },
                { status: 401 }
            );
        }

        // Handle batch updates
        if (body.readings && Array.isArray(body.readings)) {
            const batchData = body as BatchUpdateRequest;
            const validatedReadings: AQIUpdateRequest[] = [];
            const errors: { index: number; error: string }[] = [];

            batchData.readings.forEach((reading, index) => {
                const error = validateReading(reading);
                if (error) {
                    errors.push({ index, error });
                } else {
                    validatedReadings.push({
                        ...reading,
                        source: reading.source || 'api',
                    });
                }
            });

            return NextResponse.json({
                success: errors.length === 0,
                message: `Validated ${validatedReadings.length}/${batchData.readings.length} readings`,
                validatedReadings,
                errors: errors.length > 0 ? errors : undefined,
                timestamp: new Date().toISOString(),
                clientAction: 'Use firestore-aqi-service.ts to save validated readings',
            });
        }

        // Handle single update
        const data = body as AQIUpdateRequest;
        const validationError = validateReading(data);

        if (validationError) {
            return NextResponse.json(
                { success: false, error: validationError },
                { status: 400 }
            );
        }

        // Return validated data for client-side Firebase processing
        return NextResponse.json({
            success: true,
            message: 'Data validated successfully',
            data: {
                stationId: data.stationId,
                aqi: data.aqi,
                pollutants: data.pollutants,
                source: data.source || 'api',
                metadata: data.metadata,
                timestamp: new Date().toISOString(),
            },
            clientAction: 'Use firestore-aqi-service.ts updateAQIData() to save',
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid JSON or server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/firebase - API documentation
 */
export async function GET() {
    return NextResponse.json({
        name: 'PranaMesh AQI Update API',
        version: '1.0.0',
        endpoints: {
            'POST /api/firebase': {
                description: 'Submit AQI reading for validation',
                body: {
                    stationId: 'string (required)',
                    aqi: 'number 0-500 (required)',
                    pollutants: {
                        pm25: 'number (required)',
                        pm10: 'number (required)',
                        co: 'number (optional)',
                        no2: 'number (optional)',
                        so2: 'number (optional)',
                        o3: 'number (optional)',
                    },
                    source: 'manual | sensor | api (optional, default: api)',
                    metadata: {
                        deviceId: 'string (optional)',
                        notes: 'string (optional)',
                    },
                },
                headers: {
                    'x-api-key': 'API key if AQI_UPDATE_API_KEY is set',
                },
            },
            'POST /api/firebase (batch)': {
                description: 'Submit multiple readings',
                body: {
                    readings: 'Array of reading objects (same format as single)',
                },
            },
        },
        notes: [
            'This API validates data but relies on client-side Firebase for storage',
            'For IoT sensors, use this endpoint to validate before calling Firebase directly',
            'Admin UI at /admin provides a visual interface for data entry',
        ],
    });
}
