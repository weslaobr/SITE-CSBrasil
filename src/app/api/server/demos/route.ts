import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

const ADMIN_STEAM_ID = "76561198024691636";
const DEMOS_PATH = "/csgo/MatchZy/demos"; // Caminho padrão do MatchZy

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        const steamId = (session.user as any).steamId;
        if (steamId !== ADMIN_STEAM_ID) {
            return NextResponse.json({ error: 'Acesso negado. Você não é Admin.' }, { status: 403 });
        }

        const apiKey = process.env.PTERODACTYL_API_KEY;
        const serverId = process.env.PTERODACTYL_SERVER_ID;
        const panelUrl = process.env.PTERODACTYL_PANEL_URL;

        if (!apiKey || !serverId || !panelUrl) {
            return NextResponse.json({ error: 'Configuração do Pterodactyl incompleta.' }, { status: 500 });
        }

        // Tentar listar arquivos na pasta de demos
        // Pterodactyl API: GET /api/client/servers/{server}/files/list?directory={path}
        const encodedPath = encodeURIComponent(DEMOS_PATH);
        const url = `${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodedPath}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            // Se falhar, talvez o caminho esteja errado. Vamos tentar o caminho raiz do CSGO como fallback ou retornar erro detalhado
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({
                error: `Erro ao listar demos no servidor`,
                details: errorData,
                path: DEMOS_PATH
            }, { status: response.status });
        }

        const data = await response.json();
        
        // Filtrar apenas arquivos .dem
        // O Pterodactyl retorna um array em data.data
        const files = (data.data || [])
            .filter((item: any) => item.attributes.is_file && item.attributes.name.endsWith('.dem'))
            .map((item: any) => ({
                name: item.attributes.name,
                size: item.attributes.size,
                mimetype: item.attributes.mimetype,
                createdAt: item.attributes.created_at,
                modifiedAt: item.attributes.modified_at,
                path: `${DEMOS_PATH}/${item.attributes.name}`
            }));

        // Ordenar por data de modificação (mais recentes primeiro)
        files.sort((a: any, b: any) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

        return NextResponse.json({ files });

    } catch (error: any) {
        console.error('[SERVER_DEMOS]', error);
        return NextResponse.json({ error: 'Erro interno ao buscar demos', message: error.message }, { status: 500 });
    }
}
