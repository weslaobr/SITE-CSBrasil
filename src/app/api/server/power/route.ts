import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        const isAdmin = (session.user as any).isAdmin;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado. Você não é Admin.' }, { status: 403 });
        }

        const { signal } = await req.json();
        if (!['start', 'stop', 'restart', 'kill'].includes(signal)) {
            return NextResponse.json({ error: 'Sinal inválido' }, { status: 400 });
        }

        const apiKey = process.env.PTERODACTYL_API_KEY;
        const serverId = process.env.PTERODACTYL_SERVER_ID;
        const panelUrl = process.env.PTERODACTYL_PANEL_URL;

        if (!apiKey || !serverId || !panelUrl) {
            const missing = [];
            if (!apiKey) missing.push('PTERODACTYL_API_KEY');
            if (!serverId) missing.push('PTERODACTYL_SERVER_ID');
            if (!panelUrl) missing.push('PTERODACTYL_PANEL_URL');
            return NextResponse.json({ error: `Variável de ambiente faltando: ${missing.join(', ')}` }, { status: 500 });
        }

        const response = await fetch(`${panelUrl}/api/client/servers/${serverId}/power`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signal })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({
                error: `Pterodactyl respondeu with erro ${response.status}`,
                details: errorData
            }, { status: response.status });
        }

        return NextResponse.json({ success: true, signal });

    } catch (error: any) {
        console.error('[SERVER_POWER]', error);
        return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
    }
}
