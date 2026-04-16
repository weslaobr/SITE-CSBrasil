import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// O SteamID do Admin definido pelo usuário
const ADMIN_STEAM_ID = "76561198024691636";

export async function GET(req: any) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        
        // Verificação de Autenticação e Autorização
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const steamId = (session.user as any).steamId;
        if (steamId !== ADMIN_STEAM_ID) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const apiKey = process.env.PTERODACTYL_API_KEY;
        const serverId = process.env.PTERODACTYL_SERVER_ID;
        const panelUrl = process.env.PTERODACTYL_PANEL_URL;

        if (!apiKey || !serverId || !panelUrl) {
            return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
        }

        const response = await fetch(`${panelUrl}/api/client/servers/${serverId}/resources`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            next: { revalidate: 0 } // Desabilitar cache para dados em tempo real
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                error: 'Failed to fetch resources from Pterodactyl',
                details: errorData 
            }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Error fetching server resources:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
