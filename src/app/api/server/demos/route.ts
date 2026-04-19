import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

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
            return NextResponse.json({ error: 'Configuração do Pterodactyl incompleta.' }, { status: 500 });
        }

        const listFiles = async (path: string) => {
            const encodedPath = encodeURIComponent(path);
            const url = `${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodedPath}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            });

            if (!response.ok) return null;
            return await response.json();
        };

        // Tentar listar arquivos na pasta de demos, se falhar tenta na pasta raiz do MatchZy
        let data = await listFiles(DEMOS_PATH);
        let currentPath = DEMOS_PATH;

        if (!data || !data.data || data.data.length === 0) {
            data = await listFiles(FALLBACK_PATH);
            currentPath = FALLBACK_PATH;
        }

        if (!data || !data.data) {
            return NextResponse.json({ 
                error: `Não foi possível encontrar a pasta de demos no servidor`,
                tried: [DEMOS_PATH, FALLBACK_PATH]
            }, { status: 404 });
        }
        
        // Filtrar apenas arquivos .dem
        const files = (data.data || [])
            .filter((item: any) => item.attributes.is_file && item.attributes.name.endsWith('.dem'))
            .map((item: any) => ({
                name: item.attributes.name,
                size: item.attributes.size,
                mimetype: item.attributes.mimetype,
                createdAt: item.attributes.created_at,
                modifiedAt: item.attributes.modified_at,
                path: `${currentPath}/${item.attributes.name}`
            }));

        // Ordenar por data de modificação (mais recentes primeiro)
        files.sort((a: any, b: any) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

        return NextResponse.json({ files });

    } catch (error: any) {
        console.error('[SERVER_DEMOS]', error);
        return NextResponse.json({ error: 'Erro interno ao buscar demos', message: error.message }, { status: 500 });
    }
}

