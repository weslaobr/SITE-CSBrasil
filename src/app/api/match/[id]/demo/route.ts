import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

    try {
        // 1. Fetch match info from Prisma to check source and metadata
        const localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId }
        });

        // 2. Handle Mix matches using Firegames/Pterodactyl API
        if (localMatch && (localMatch.source === 'mix' || localMatch.source === 'vanilla')) {
            const meta = (localMatch.metadata as any) || {};
            let filePath = meta.demoUrl || meta.demo_url || meta.filePath;

            // If we have a filePath (or a URL that we can extract the path from)
            if (filePath && !filePath.startsWith('http')) {
                // It's already a relative path, use it
            } else if (filePath && filePath.includes('file_path=')) {
                // Extract from existing Firegames URL if possible
                const urlObj = new URL(filePath);
                filePath = urlObj.searchParams.get('file_path') || filePath;
            }

            // If we have a path, call Pterodactyl to get a signed URL
            if (filePath && !filePath.startsWith('http')) {
                try {
                    const apiKey = process.env.PTERODACTYL_API_KEY;
                    const serverId = process.env.PTERODACTYL_SERVER_ID;
                    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

                    if (apiKey && serverId && panelUrl) {
                        const pterodactylUrl = `${panelUrl}/api/client/servers/${serverId}/files/download?file=${encodeURIComponent(filePath)}`;
                        const pteroRes = await fetch(pterodactylUrl, {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Accept': 'application/json',
                            },
                        });

                        if (pteroRes.ok) {
                            const pteroData = await pteroRes.json();
                            return NextResponse.redirect(pteroData.attributes.url);
                        }
                    }
                } catch (pteroError: any) {
                    console.error(`Pterodactyl link generation failed for ${matchId}:`, pteroError.message);
                }
            }
        }

        // 3. Normal Path: Try to fetch from the Python Tracker Backend (for local files)
        try {
            const trackerResponse = await axios.get(`${TRACKER_API}/api/match/${matchId}/demo`, {
                responseType: 'arraybuffer',
                timeout: 3000, 
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
            // 4. Final Fallback: If Python fails or returns 404, check Prisma for a direct URL
            const meta = (localMatch?.metadata as any) || {};
            const demoUrl = meta.demoUrl || meta.demo_url;

            if (demoUrl && demoUrl.startsWith('http')) {
                return NextResponse.redirect(demoUrl);
            }

            return NextResponse.json(
                { error: "Demo file not found or backend unavailable." },
                { status: error.response?.status || 500 }
            );
        }
    } catch (globalError: any) {
        console.error(`Global error in demo proxy for ${matchId}:`, globalError.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
