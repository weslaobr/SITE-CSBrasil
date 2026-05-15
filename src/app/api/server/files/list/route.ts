import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import * as ftp from 'basic-ftp';

export async function GET(req: NextRequest) {
    const client = new ftp.Client();
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session?.user || !(session.user as any).isAdmin) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const path = searchParams.get('path') || '/';

        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT || '21'),
            secure: false
        });

        const list = await client.list(path);
        const files = list.map(item => ({
            name: item.name,
            size: item.size,
            type: item.type === 2 ? 'directory' : 'file',
            modifiedAt: item.modifiedAt
        }));

        return NextResponse.json({ files });
    } catch (error: any) {
        console.error('[FILES_LIST]', error);
        return NextResponse.json({ error: 'Erro ao listar arquivos', message: error.message }, { status: 500 });
    } finally {
        client.close();
    }
}
