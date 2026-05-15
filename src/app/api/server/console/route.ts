import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const isAdmin = (session.user as any).isAdmin;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const dathostApiKey = process.env.DATHOST_API_KEY;

        if (dathostApiKey && dathostApiKey !== 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            return NextResponse.json({ 
                socket: null, 
                token: null,
                provider: 'dathost',
                message: 'O console em tempo real da DatHost deve ser acessado via pooling de logs.'
            });
        }

        return NextResponse.json({ error: 'API Key da DatHost não configurada.' }, { status: 500 });

    } catch (error: any) {
        console.error('[SERVER_CONSOLE_API]', error);
        return NextResponse.json({ error: 'Erro interno', message: error.message }, { status: 500 });
    }
}
