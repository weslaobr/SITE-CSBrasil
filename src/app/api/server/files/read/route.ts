import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';
import { PassThrough } from 'stream';

export async function GET(req: NextRequest) {
    const client = new ftp.Client();
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session?.user || !(session.user as any).isAdmin) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('file');

        if (!filePath) {
            return NextResponse.json({ error: 'Arquivo não especificado' }, { status: 400 });
        }

        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT || '21'),
            secure: false
        });

        const passThrough = new PassThrough();
        let content = "";
        
        const downloadPromise = client.downloadTo(passThrough, filePath);
        
        for await (const chunk of passThrough) {
            content += chunk.toString();
        }
        
        await downloadPromise;

        return NextResponse.json({ content });
    } catch (error: any) {
        console.error('[FILES_READ]', error);
        return NextResponse.json({ error: 'Erro ao ler arquivo', message: error.message }, { status: 500 });
    } finally {
        client.close();
    }
}
