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

        const isAdmin = (session.user as any).isAdmin;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const dathostApiKey = process.env.DATHOST_API_KEY;
        const dathostServerId = process.env.DATHOST_SERVER_ID;

        if (!dathostApiKey || dathostApiKey === 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            return NextResponse.json({
                attributes: {
                    current_state: 'offline',
                    resources: { memory_bytes: 0, cpu_absolute: 0, disk_bytes: 0, network_rx_bytes: 0, network_tx_bytes: 0 }
                }
            });
        }

        try {
            const response = await axios.get(
                `https://dathost.net/api/0.1/game-servers/${dathostServerId}`,
                {
                    auth: {
                        username: dathostApiKey,
                        password: ''
                    }
                }
            );
            
            const server = response.data;
            const mappedData = {
                attributes: {
                    current_state: server.booting ? 'starting' : (server.on ? 'running' : 'offline'),
                    resources: {
                        memory_bytes: (server.memory_usage || 0) * 1024 * 1024,
                        cpu_absolute: server.cpu_usage || 0,
                        disk_bytes: 0,
                        network_rx_bytes: 0,
                        network_tx_bytes: 0
                    }
                }
            };
            
            return NextResponse.json(mappedData);
        } catch (err: any) {
            console.error('[DATHOST_RESOURCES_ERROR]', err.message);
            return NextResponse.json({
                attributes: {
                    current_state: 'offline',
                    resources: { memory_bytes: 0, cpu_absolute: 0, disk_bytes: 0, network_rx_bytes: 0, network_tx_bytes: 0 }
                }
            });
        }

    } catch (error: any) {
        console.error('[SERVER_RESOURCES_API_CRITICAL]', error);
        return NextResponse.json({ 
            attributes: { current_state: 'offline', resources: { memory_bytes: 0, cpu_absolute: 0, disk_bytes: 0, network_rx_bytes: 0, network_tx_bytes: 0 } }
        });
    }
}
