import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEMOS_PATH = "game/csgo/MatchZy/demos"; // Caminho padrão do MatchZy
const FALLBACK_PATH = "game/csgo/MatchZy";    // Caminho alternativo

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        const apiKey = process.env.PTERODACTYL_API_KEY;
        const serverId = process.env.PTERODACTYL_SERVER_ID;
        const panelUrl = process.env.PTERODACTYL_PANEL_URL;

        if (!apiKey || !serverId || !panelUrl) {
            return NextResponse.json({ error: 'Configuração do Pterodactyl incompleta no servidor' }, { status: 500 });
        }

        const listFiles = async (path: string) => {
            const encodedPath = encodeURIComponent(path);
            const url = `${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodedPath}`;

            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    return { ok: false, status: response.status, path };
                }
                const data = await response.json();
                return { ok: true, data, path };
            } catch (err) {
                return { ok: false, status: 500, error: String(err), path };
            }
        };

        // Lista de caminhos comuns para buscar demos do MatchZy no CS2
        const SEARCH_PATHS = [
            "game/csgo/MatchZy/demos",
            "csgo/MatchZy/demos",
            "MatchZy/demos",
            "game/csgo/demos",
            "csgo/demos",
            "demos"
        ];

        let result = null;
        const attemptedPaths = [];

        for (const path of SEARCH_PATHS) {
            const res = await listFiles(path);
            attemptedPaths.push({ path, status: res.status ?? (res.ok ? 200 : 'error') });
            
            if (res.ok && res.data?.data && res.data.data.length > 0) {
                result = res;
                break;
            }
        }

        if (!result) {
            return NextResponse.json({ 
                error: `Pasta de demos não encontrada nos locais padrão`,
                tried: attemptedPaths,
                message: "Certifique-se de que o MatchZy gravou pelo menos uma partida."
            }, { status: 404 });
        }

        const data = result.data;
        const files = (data.data || [])
            .filter((item: any) => item?.attributes?.name && item.attributes.is_file && item.attributes.name.endsWith('.dem'))
            .map((item: any) => {
                const matchId = item.attributes.name.split('_').pop()?.replace('.dem', '');
                return {
                    name: item.attributes.name,
                    size: item.attributes.size,
                    mimetype: item.attributes.mimetype,
                    createdAt: item.attributes.created_at,
                    modifiedAt: item.attributes.modified_at,
                    path: `${result.path}/${item.attributes.name}`,
                    matchId: matchId
                };
            });

        // Buscar informações das partidas no banco de dados para os arquivos encontrados
        const matchIds = files.map((f: any) => f.matchId).filter(Boolean);
        const matches = await prisma.globalMatch.findMany({
            where: { id: { in: matchIds } },
            include: { players: true }
        });

        // Mesclar informações da demo com informações da partida
        const filesWithMatchInfo = files.map((file: any) => {
            const match = matches.find(m => m.id === file.matchId);
            const playersPreview = match?.players.map(p => {
                const pMeta = p.metadata as any;
                return pMeta?.name || pMeta?.nickname || pMeta?.displayName || 'Jogador';
            }).filter(Boolean) || [];

            return {
                ...file,
                matchInfo: match ? {
                    id: match.id,
                    mapName: match.mapName || 'Desconhecido',
                    score: match.scoreA !== null ? `${match.scoreA}x${match.scoreB}` : null,
                    players: playersPreview
                } : null
            };
        });

        // Ordenar por data (mais recentes primeiro)
        filesWithMatchInfo.sort((a: any, b: any) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

        return NextResponse.json({ files: filesWithMatchInfo });

    } catch (error: any) {
        console.error('[SERVER_DEMOS]', error);
        return NextResponse.json({ error: 'Erro interno ao buscar demos', message: error.message }, { status: 500 });
    }
}

