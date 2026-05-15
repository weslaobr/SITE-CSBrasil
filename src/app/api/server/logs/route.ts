import { NextResponse } from 'next/server';
import axios from 'axios';

// Persist logs in memory for caching
let cachedLogs: string[] = [];
let lastFetch = 0;

export async function GET() {
    const now = Date.now();
    
    // Refresh every 5s
    if (now - lastFetch > 5000) {
        lastFetch = now;
        
            const dathostEmail = process.env.DATHOST_EMAIL;
            const dathostApiKey = process.env.DATHOST_API_KEY;
            const dathostServerId = process.env.DATHOST_SERVER_ID;

            if (dathostEmail && dathostApiKey && dathostApiKey !== 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
                try {
                    const response = await axios.get(
                        `https://dathost.net/api/0.1/game-servers/${dathostServerId}/console`,
                        {
                            auth: {
                                username: dathostEmail,
                                password: dathostApiKey
                            }
                        }
                    );
                
                if (response.data && response.data.lines) {
                    cachedLogs = response.data.lines;
                }
            } catch (err: any) {
                console.error('[DATHOST_LOGS_ERROR]', err.message);
            }
        }
    }

    return NextResponse.json(cachedLogs);
}
