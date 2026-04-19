import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

    try {
        // Proxy to the Python backend to get the demo file
        const response = await axios.get(`${TRACKER_API}/api/match/${matchId}/demo`, {
            responseType: 'arraybuffer',
        });

        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const contentDisposition = response.headers['content-disposition'] || `attachment; filename="${matchId}.dem"`;

        return new NextResponse(response.data, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': contentDisposition,
            },
        });
    } catch (error: any) {
        console.error(`Error proxying demo download for match ${matchId}:`, error.message);
        return NextResponse.json(
            { error: "Demo file not found or backend unavailable." },
            { status: error.response?.status || 500 }
        );
    }
}
