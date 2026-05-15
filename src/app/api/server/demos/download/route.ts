import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
    const client = new ftp.Client();
    
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

        const host = process.env.FTP_HOST;
        const port = parseInt(process.env.FTP_PORT || '21');
        const user = process.env.FTP_USER;
        const password = process.env.FTP_PASS;

        if (!host || !user || !password) {
            return NextResponse.json({ error: 'Configuração de FTP incompleta.' }, { status: 500 });
        }

        await client.access({ host, user, password, port, secure: false });

        // We'll stream the file directly to the response
        // Note: Next.js App Router response can take a ReadableStream
        
        const fileName = filePath.split('/').pop() || 'demo.dem';
        
        // basic-ftp downloadToStream returns a promise that resolves when done
        // We need a way to get a readable stream.
        // We can use a PassThrough stream.
        const { PassThrough } = await import('stream');
        const passThrough = new PassThrough();
        
        // Start the download in background
        client.downloadTo(passThrough, filePath).finally(() => {
            client.close();
        });

        // Convert Node Readable to Web ReadableStream
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

    } catch (error: any) {
        console.error('[SERVER_DEMO_DOWNLOAD_FTP]', error);
        client.close();
        return NextResponse.json({ error: 'Erro ao baixar demo via FTP', message: error.message }, { status: 500 });
    }
}
