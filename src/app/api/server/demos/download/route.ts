import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado. Faça login com a Steam.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('file');

        if (!filePath) {
            return NextResponse.json({ error: 'Caminho do arquivo não fornecido' }, { status: 400 });
        }

        const apiKey = process.env.PTERODACTYL_API_KEY;
        const serverId = process.env.PTERODACTYL_SERVER_ID;
        const panelUrl = process.env.PTERODACTYL_PANEL_URL;

        if (!apiKey || !serverId || !panelUrl) {
            return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
        }

        // Pterodactyl API: GET /api/client/servers/{server}/files/download?file={path}
        const url = `${panelUrl}/api/client/servers/${serverId}/files/download?file=${encodeURIComponent(filePath)}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({
                error: `Erro ao gerar link de download`,
                details: errorData
            }, { status: response.status });
        }

        const data = await response.json();
        
        // Retorna a URL assinada para o frontend
        return NextResponse.json({ 
            downloadUrl: data.attributes.url 
        });

    } catch (error: any) {
        console.error('[SERVER_DEMO_DOWNLOAD]', error);
        return NextResponse.json({ error: 'Erro interno', message: error.message }, { status: 500 });
    }
}
