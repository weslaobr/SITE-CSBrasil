import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;

    if (!LEETIFY_API_KEY) {
        return NextResponse.json({ error: "LEETIFY_API_KEY missing" }, { status: 500 });
    }

    try {
        const response = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error(`Error fetching match ${matchId}:`, error.message);
        return NextResponse.json({ error: "Failed to fetch match details" }, { status: 500 });
    }
}
