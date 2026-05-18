import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';
import axios from 'axios';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('file');
        const token = searchParams.get('token');

        const isValidToken = token && token === process.env.SYNC_SECRET_TOKEN;

        if (!session?.user && !isValidToken) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        if (!filePath) {
            return NextResponse.json({ error: 'Arquivo não especificado.' }, { status: 400 });
        }

        const fileName = filePath.split('/').pop() || 'demo.dem';

        // --- TENTATIVA 1: FTP (se configurado) ---
        const ftpHost = process.env.FTP_HOST;
        const ftpPort = parseInt(process.env.FTP_PORT || '21');
        const ftpUser = process.env.FTP_USER;
        const ftpPass = process.env.FTP_PASS;

        if (ftpHost && ftpUser && ftpPass) {
            const client = new ftp.Client();
            try {
                await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, port: ftpPort, secure: false });

                const { PassThrough } = await import('stream');
                const passThrough = new PassThrough();

                client.downloadTo(passThrough, filePath).finally(() => {
                    client.close();
                });

                const webStream = new ReadableStream({
                    start(controller) {
                        passThrough.on('data', (chunk) => controller.enqueue(chunk));
                        passThrough.on('end', () => controller.close());
                        passThrough.on('error', (err) => controller.error(err));
                    },
                    cancel() {
                        passThrough.destroy();
                        client.close();
                    }
                });

                return new NextResponse(webStream, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="${fileName}"`,
                    },
                });
            } catch (ftpError: any) {
                console.warn('[DEMO_DOWNLOAD] FTP failed, falling back to DatHost REST API...', ftpError.message);
                client.close();
            }
        }

        // --- TENTATIVA 2: DatHost REST API ---
        const dathostEmail = process.env.DATHOST_EMAIL;
        const dathostApiKey = process.env.DATHOST_API_KEY;
        const dathostServerId = process.env.DATHOST_SERVER_ID;

        if (dathostEmail && dathostApiKey && dathostServerId && dathostApiKey !== 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI') {
            try {
                // Request the file stream from DatHost REST API
                const response = await axios.get(
                    `https://dathost.net/api/0.1/game-servers/${dathostServerId}/files/${encodeURIComponent(filePath)}`,
                    {
                        auth: {
                            username: dathostEmail,
                            password: dathostApiKey
                        },
                        responseType: 'stream' // We want the raw stream
                    }
                );

                // Convert Node Readable to Web ReadableStream
                const nodeStream = response.data;
                const webStream = new ReadableStream({
                    start(controller) {
                        nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
                        nodeStream.on('end', () => controller.close());
                        nodeStream.on('error', (err: any) => controller.error(err));
                    },
                    cancel() {
                        nodeStream.destroy();
                    }
                });

                return new NextResponse(webStream, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="${fileName}"`,
                    },
                });

            } catch (apiError: any) {
                console.error('[DEMO_DOWNLOAD] DatHost API download failed:', apiError.message);
            }
        }

        return NextResponse.json({ error: 'Erro ao baixar demo via FTP ou API REST' }, { status: 500 });

    } catch (error: any) {
        console.error('[SERVER_DEMO_DOWNLOAD_CRITICAL]', error);
        return NextResponse.json({ error: 'Erro ao processar download', message: error.message }, { status: 500 });
    }
}
