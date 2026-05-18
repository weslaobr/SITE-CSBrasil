import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';

const DEMOS_PATH = "game/csgo/MatchZy/demos"; 
const FALLBACK_PATH = "game/csgo/MatchZy";    

export async function GET(req: NextRequest) {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        const host = process.env.FTP_HOST;
        const port = parseInt(process.env.FTP_PORT || '21');
        const user = process.env.FTP_USER;
        const password = process.env.FTP_PASS;

        if (!host || !user || !password) {
            return NextResponse.json({ error: 'Configuração de FTP incompleta no servidor.' }, { status: 500 });
        }

        await client.access({
            host,
            user,
            password,
            port,
            secure: false // DatHost FTP usually doesn't use TLS on port 21, or uses explicit TLS which basic-ftp handles
        });

        const candidatePaths = [
            "MatchZy",
            "MatchZy/demos",
            "game/csgo/MatchZy",
            "game/csgo/MatchZy/demos"
        ];

        let list: ftp.FileInfo[] = [];
        let currentPath = "";

        for (const path of candidatePaths) {
            try {
                const tempList = await client.list(path);
                // Check if this list contains any .dem files case-insensitively
                const hasDemos = tempList.some(item => item.isFile && item.name.toLowerCase().endsWith('.dem'));
                if (hasDemos || (tempList.length > 0 && !currentPath)) {
                    list = tempList;
                    currentPath = path;
                    if (hasDemos) {
                        break; // Found the active folder with actual demos, stop searching
                    }
                }
            } catch (e) {
                // Ignore and try next candidate
            }
        }

        if (!currentPath) {
            console.error("FTP List error: Could not find any demos directory in candidates", candidatePaths);
            return NextResponse.json({ 
                error: `Não foi possível encontrar a pasta de demos no servidor FTP`,
                tried: candidatePaths
            }, { status: 404 });
        }

        // Filtrar apenas arquivos .dem (case-insensitive)
        const files = list
            .filter(item => item.isFile && item.name.toLowerCase().endsWith('.dem'))
            .map(item => ({
                name: item.name,
                size: item.size,
                mimetype: 'application/octet-stream',
                createdAt: item.modifiedAt,
                modifiedAt: item.modifiedAt,
                path: `${currentPath}/${item.name}`
            }));

        // Ordenar por data de modificação (mais recentes primeiro)
        files.sort((a, b) => {
            const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
            const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
            return timeB - timeA;
        });

        return NextResponse.json({ files });

    } catch (error: any) {
        console.error('[SERVER_DEMOS_FTP]', error);
        return NextResponse.json({ error: 'Erro ao buscar demos via FTP', message: error.message }, { status: 500 });
    } finally {
        client.close();
    }
}
