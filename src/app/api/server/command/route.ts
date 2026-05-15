import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import axios from 'axios';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const isAdmin = (session.user as any).isAdmin;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { command } = await req.json();
        if (!command) {
            return NextResponse.json({ error: 'Comando não fornecido' }, { status: 400 });
        }

        const dathostApiKey = process.env.DATHOST_API_KEY;
        const dathostServerId = process.env.DATHOST_SERVER_ID;

        if (!dathostApiKey || dathostApiKey === 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            return NextResponse.json({ error: 'API Key da DatHost não configurada no .env' }, { status: 500 });
        }

        try {
            await axios.post(
                `https://dathost.net/api/0.1/game-servers/${dathostServerId}/console`,
                `line=${encodeURIComponent(command)}`,
                {
                    auth: {
                        username: dathostApiKey,
                        password: ''
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            return NextResponse.json({ success: true });
        } catch (err: any) {
            console.error('[DATHOST_COMMAND_ERROR]', err.response?.data || err.message);
            return NextResponse.json({ 
                error: 'Erro ao enviar comando para DatHost', 
                details: err.response?.data || err.message 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[SERVER_COMMAND_API]', error);
        return NextResponse.json({ error: 'Erro interno', message: error.message }, { status: 500 });
    }
}
