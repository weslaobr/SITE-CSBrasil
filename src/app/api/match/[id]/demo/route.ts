import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

    // 1. Try to fetch from the Python Tracker Backend
    try {
        const trackerResponse = await axios.get(`${TRACKER_API}/api/match/${matchId}/demo`, {
            responseType: 'arraybuffer',
            timeout: 5000, // 5 seconds timeout
        });

        const contentType = trackerResponse.headers['content-type'] || 'application/octet-stream';
        const contentDisposition = trackerResponse.headers['content-disposition'] || `attachment; filename="${matchId}.dem"`;

        return new NextResponse(trackerResponse.data, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': contentDisposition,
            },
        });
    } catch (error: any) {
        // 2. Fallback: If Backend fails or returns 404, check our Prisma DB (GlobalMatch)
        console.warn(`Tracker API failed/404 for demo ${matchId}, trying fallback to Prisma DB...`);
        
        try {
            const localMatch = await prisma.globalMatch.findUnique({
                where: { id: matchId }
            });

            const demoUrl = (localMatch?.metadata as any)?.demoUrl || (localMatch?.metadata as any)?.demo_url;

            if (demoUrl && demoUrl.startsWith('http')) {
                return NextResponse.redirect(demoUrl);
            }
        } catch (dbError: any) {
            console.error(`Fallback DB check failed for match ${matchId}:`, dbError.message);
        }

        // 3. Last resort: Return error
        return NextResponse.json(
            { error: "Demo file not found or backend unavailable." },
            { status: error.response?.status || 500 }
        );
    }
}
