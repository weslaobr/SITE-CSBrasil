import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';
import axios from 'axios';

const candidatePaths = [
    "MatchZy/demos",
    "MatchZy",
    "game/csgo/MatchZy/demos",
    "game/csgo/MatchZy"
];

function extractDateFromFilename(filename: string): Date {
    const match = filename.match(/(\d{8})_(\d{4})/);
    if (match) {
        const d = match[1]; // YYYYMMDD
        const t = match[2]; // HHMM
        const year = parseInt(d.slice(0, 4));
        const month = parseInt(d.slice(4, 6)) - 1;
        const day = parseInt(d.slice(6, 8));
        const hour = parseInt(t.slice(0, 2));
        const minute = parseInt(t.slice(2, 4));
        return new Date(year, month, day, hour, minute);
    }
    return new Date();
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        // --- TENTATIVA 1: FTP (se configurado) ---
        const ftpHost = process.env.FTP_HOST;
        const ftpPort = parseInt(process.env.FTP_PORT || '21');
        const ftpUser = process.env.FTP_USER;
        const ftpPass = process.env.FTP_PASS;

        if (ftpHost && ftpUser && ftpPass) {
            const client = new ftp.Client();
            client.ftp.verbose = false;
            try {
                await client.access({
                    host: ftpHost,
                    user: ftpUser,
                    password: ftpPass,
                    port: ftpPort,
                    secure: false
                });

                let list: ftp.FileInfo[] = [];
                let currentPath = "";

                for (const path of candidatePaths) {
                    try {
                        const tempList = await client.list(path);
                        const hasDemos = tempList.some(item => item.isFile && item.name.toLowerCase().endsWith('.dem'));
                        if (hasDemos || (tempList.length > 0 && !currentPath)) {
                            list = tempList;
                            currentPath = path;
                            if (hasDemos) break;
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                if (currentPath) {
                    const files = list
                        .filter(item => item.isFile && item.name.toLowerCase().endsWith('.dem'))
                        .map(item => ({
                            name: item.name,
                            size: item.size,
                            mimetype: 'application/octet-stream',
                            createdAt: item.modifiedAt || extractDateFromFilename(item.name).toISOString(),
                            modifiedAt: item.modifiedAt || extractDateFromFilename(item.name).toISOString(),
                            path: `${currentPath}/${item.name}`
                        }));

                    files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
                    client.close();
                    return NextResponse.json({ files });
                }
            } catch (ftpError: any) {
                console.warn('[DEMOS_API] FTP failed, falling back to DatHost REST API...', ftpError.message);
            } finally {
                client.close();
            }
        }

        // --- TENTATIVA 2: DatHost REST API ---
        const dathostEmail = process.env.DATHOST_EMAIL;
        const dathostApiKey = process.env.DATHOST_API_KEY;
        const dathostServerId = process.env.DATHOST_SERVER_ID;

        if (dathostEmail && dathostApiKey && dathostServerId && dathostApiKey !== 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            for (const path of candidatePaths) {
                try {
                    const response = await axios.get(
                        `https://dathost.net/api/0.1/game-servers/${dathostServerId}/files/${encodeURIComponent(path)}`,
                        {
                            auth: {
                                username: dathostEmail,
                                password: dathostApiKey
                            },
                            headers: {
                                'Accept': 'application/json'
                            },
                            timeout: 8000 // 8s timeout
                        }
                    );

                    if (Array.isArray(response.data)) {
                        const hasDemos = response.data.some((item: any) => {
                            const name = item.path.split('/').pop() || '';
                            return name.toLowerCase().endsWith('.dem');
                        });

                        if (hasDemos) {
                            const files = response.data
                                .filter((item: any) => {
                                    const name = item.path.split('/').pop() || '';
                                    return name.toLowerCase().endsWith('.dem');
                                })
                                .map((item: any) => {
                                    const name = item.path.split('/').pop() || '';
                                    const fileDate = extractDateFromFilename(name).toISOString();
                                    return {
                                        name,
                                        size: typeof item.size === 'number' ? item.size : parseInt(item.size || '0'),
                                        mimetype: 'application/octet-stream',
                                        createdAt: fileDate,
                                        modifiedAt: fileDate,
                                        path: item.path
                                    };
                                });

                            files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
                            return NextResponse.json({ files });
                        }
                    }
                } catch (apiError: any) {
                    console.warn(`[DEMOS_API] DatHost API candidate path "${path}" query failed:`, apiError.message);
                }
            }
        }

        return NextResponse.json({ 
            error: 'Não foi possível buscar as demos do servidor. Conexão FTP e API REST indisponíveis.' 
        }, { status: 500 });

    } catch (error: any) {
        console.error('[SERVER_DEMOS_API_CRITICAL]', error);
        return NextResponse.json({ error: 'Erro ao buscar demos', message: error.message }, { status: 500 });
    }
}
