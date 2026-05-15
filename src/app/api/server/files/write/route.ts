import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
    const client = new ftp.Client();
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session?.user || !(session.user as any).isAdmin) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { filePath, content } = await req.json();

        if (!filePath || content === undefined) {
            return NextResponse.json({ error: 'Caminho ou conteúdo não fornecido' }, { status: 400 });
        }

        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT || '21'),
            secure: false
        });

        const stream = Readable.from([content]);
        await client.uploadFrom(stream, filePath);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[FILES_WRITE]', error);
        return NextResponse.json({ error: 'Erro ao salvar arquivo', message: error.message }, { status: 500 });
    } finally {
        client.close();
    }
}
