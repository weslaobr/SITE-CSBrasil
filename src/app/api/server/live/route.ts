import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import axios from 'axios';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const dathostEmail = process.env.DATHOST_EMAIL;
        const dathostApiKey = process.env.DATHOST_API_KEY;
        const dathostServerId = process.env.DATHOST_SERVER_ID;

        if (!dathostEmail || !dathostApiKey || dathostApiKey === 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        try {
            // Este endpoint fornece o placar, mapa e status em tempo real
            const response = await axios.get(
                `https://dathost.net/api/0.1/cs-monitoring/server/${dathostServerId}/overview`,
                {
                    auth: {
                        username: dathostEmail,
                        password: dathostApiKey
                    }
                }
            );
            
            return NextResponse.json(response.data);
        } catch (err: any) {
            console.error('[DATHOST_LIVE_ERROR]', err.message);
            return NextResponse.json({ error: 'Erro ao buscar dados ao vivo' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[SERVER_LIVE_API]', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
