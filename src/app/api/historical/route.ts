import { NextResponse } from 'next/server';
import { getHistoricalData, DELHI_STATIONS, type StationId, type TimeRange, type CustomDateRange } from '@/lib/historical-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = (searchParams.get('range') || '24h') as TimeRange;
        const stationId = (searchParams.get('station') || 'aicte-delhi') as StationId;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Validate range
        if (!['24h', '7d', '30d', 'custom'].includes(range)) {
            return NextResponse.json(
                { success: false, error: 'Invalid range. Use 24h, 7d, 30d, or custom' },
                { status: 400 }
            );
        }

        // Validate station
        const validStation = DELHI_STATIONS.find(s => s.id === stationId);
        if (!validStation) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid station',
                    validStations: DELHI_STATIONS.map(s => ({ id: s.id, name: s.name, type: s.type }))
                },
                { status: 400 }
            );
        }

        // Handle custom date range
        let customRange: CustomDateRange | undefined;
        if (range === 'custom') {
            if (!startDate || !endDate) {
                return NextResponse.json(
                    { success: false, error: 'Custom range requires startDate and endDate parameters' },
                    { status: 400 }
                );
            }

            // Validate date formats
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return NextResponse.json(
                    { success: false, error: 'Invalid date format. Use ISO date string (YYYY-MM-DD)' },
                    { status: 400 }
                );
            }

            if (start > end) {
                return NextResponse.json(
                    { success: false, error: 'Start date must be before or equal to end date' },
                    { status: 400 }
                );
            }

            // Cap at 90 days
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 90) {
                return NextResponse.json(
                    { success: false, error: 'Date range cannot exceed 90 days' },
                    { status: 400 }
                );
            }

            customRange = { startDate, endDate };
        }

        const result = await getHistoricalData(stationId, range, customRange);

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Historical API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

