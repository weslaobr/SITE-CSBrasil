import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'src/config/maps.json');

async function ensureAdmin(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    if (!session?.user) return { error: 'Não autorizado', status: 401 };
    
    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) return { error: 'Acesso negado', status: 403 };
    
    return { user: session.user };
}

export async function GET(req: NextRequest) {
    try {
        const auth = await ensureAdmin(req);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error('[MAPS_API_GET]', error);
        return NextResponse.json({ error: 'Erro ao carregar mapas' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await ensureAdmin(req);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await req.json();
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
        }

        await fs.writeFile(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8');
        return NextResponse.json({ success: true, maps: body });
    } catch (error) {
        console.error('[MAPS_API_POST]', error);
        return NextResponse.json({ error: 'Erro ao salvar mapas' }, { status: 500 });
    }
}
