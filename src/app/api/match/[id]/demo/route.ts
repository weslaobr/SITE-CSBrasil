import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

    console.log(`[DEMO_PROXY] Starting download request for match: ${matchId}`);

    try {
        // 1. Fetch match info from Prisma
        let localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId }
        }) as any;

        let legacyMatch = null;
        if (!localMatch) {
            // Try searching by cuid or externalId in legacy Match table
            legacyMatch = await prisma.match.findFirst({
                where: {
                    OR: [
                        { id: matchId },
                        { externalId: matchId },
                        { externalId: `leetify-${matchId}` }
                    ]
                }
            });
        }

        if (!localMatch && !legacyMatch) {
            console.warn(`[DEMO_PROXY] Match ${matchId} not found in any table.`);
        } else {
            console.log(`[DEMO_PROXY] Match found. Source: ${localMatch?.source || legacyMatch?.source}`);
        }

        // 2. Handle Mix matches using Firegames/Pterodactyl API
        const matchSource = (localMatch?.source || legacyMatch?.source || '').toLowerCase();
        const isMix = matchSource === 'mix' || matchSource === 'vanilla';
        if (isMix) {
            const meta = (localMatch?.metadata as any) || (legacyMatch?.metadata as any) || {};
            let filePath = meta.demoUrl || meta.demo_url || meta.filePath;

            console.log(`[DEMO_PROXY] Mix match detected. Identifying filePath...`);

            // If we have a filePath (or a URL that we can extract the path from)
            if (filePath && !filePath.startsWith('http')) {
                // It's already a relative path, use it
            } else if (filePath && filePath.includes('file_path=')) {
                // Extract from existing Firegames URL if possible
                try {
                    const urlObj = new URL(filePath);
                    filePath = urlObj.searchParams.get('file_path') || filePath;
                } catch (e) {
                    // Not a valid URL, keep as is
                }
            }

            console.log(`[DEMO_PROXY] Target filePath: ${filePath || 'NONE'}`);

            // If we have a path, call Pterodactyl to get a signed URL
            if (filePath && !filePath.startsWith('http')) {
                try {
                    const apiKey = process.env.PTERODACTYL_API_KEY;
                    const serverId = process.env.PTERODACTYL_SERVER_ID;
                    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

                    if (apiKey && serverId && panelUrl) {
                        const pterodactylUrl = `${panelUrl}/api/client/servers/${serverId}/files/download?file=${encodeURIComponent(filePath)}`;
                        console.log(`[DEMO_PROXY] Requesting signed URL from Pterodactyl...`);
                        
                        const pteroRes = await fetch(pterodactylUrl, {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Accept': 'application/json',
                            },
                        });

                        if (pteroRes.ok) {
                            const pteroData = await pteroRes.json();
                            console.log(`[DEMO_PROXY] Signed URL generated successfully. Redirecting...`);
                            return NextResponse.redirect(pteroData.attributes.url);
                        } else {
                            console.error(`[DEMO_PROXY] Pterodactyl API error: ${pteroRes.status}`);
                        }
                    } else {
                        console.error(`[DEMO_PROXY] Pterodactyl config missing (API_KEY/SERVER_ID/URL)`);
                    }
                } catch (pteroError: any) {
                    console.error(`[DEMO_PROXY] Pterodactyl link generation failed for ${matchId}:`, pteroError.message);
                }
            }
        }

        // 3. Normal Path: Try to fetch from the Python Tracker Backend (for local files)
        try {
            console.log(`[DEMO_PROXY] Checking local/tracker storage at ${TRACKER_API}...`);
            const trackerResponse = await axios.get(`${TRACKER_API}/api/match/${matchId}/demo`, {
                responseType: 'arraybuffer',
                timeout: 3000, 
            });

            console.log(`[DEMO_PROXY] File found in tracker. Serving...`);
            const contentType = trackerResponse.headers['content-type'] || 'application/octet-stream';
            const contentDisposition = trackerResponse.headers['content-disposition'] || `attachment; filename="${matchId}.dem"`;

            return new NextResponse(trackerResponse.data, {
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': contentDisposition,
                },
            });
        } catch (error: any) {
            console.log(`[DEMO_PROXY] Tracker check failed: ${error.message}`);

            // 3.5. Try Bot API as a last resort
            try {
                const botUrl = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:8080';
                console.log(`[DEMO_PROXY] Checking Bot API for match ${matchId}...`);
                const botRes = await axios.get(`${botUrl}/match/${matchId}`);
                if (botRes.data && botRes.data.demo_url) {
                    console.log(`[DEMO_PROXY] Found demo URL in Bot API. Redirecting...`);
                    return NextResponse.redirect(botRes.data.demo_url);
                }
            } catch (botErr) {
                console.log(`[DEMO_PROXY] Bot API check failed.`);
            }

            // 4. Final Fallback: Check metadata for a direct demo URL (excluding scoreboard links)
            const meta = (localMatch?.metadata as any) || (legacyMatch?.metadata as any) || {};
            let demoUrl = meta.demoUrl || meta.demo_url;

            // If the only URL we have is a Leetify scoreboard, don't use it as a 'demo download'
            if (demoUrl && demoUrl.includes('leetify.com/app/match-details')) {
                demoUrl = null;
            }

            if (demoUrl && demoUrl.startsWith('http')) {
                console.log(`[DEMO_PROXY] Falling back to direct URL redirect: ${demoUrl}`);
                return NextResponse.redirect(demoUrl);
            }

            console.error(`[DEMO_PROXY] No demo file or link found for match ${matchId}`);
            return NextResponse.json(
                { error: "Arquivo de demo não encontrado para esta partida." },
                { status: 404 }
            );
        }
    } catch (globalError: any) {
        console.error(`[DEMO_PROXY] Global error for ${matchId}:`, globalError.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
