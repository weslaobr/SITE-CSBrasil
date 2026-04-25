import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    if (!session?.user) return { error: 'Não autorizado', status: 401 };
    
    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) return { error: 'Acesso negado', status: 403 };
    
    return { user: session.user };
}

async function ensureModerator(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    if (!session?.user) return { error: 'Não autorizado', status: 401 };
    
    const isModerator = (session.user as any).isModerator;
    if (!isModerator) return { error: 'Acesso negado', status: 403 };
    
    return { user: session.user };
}

export async function GET(req: NextRequest) {
    try {
        const auth = await ensureModerator(req);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { steamId: { contains: search, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                name: true,
                steamId: true,
                image: true,
                isAdmin: true,
                isModerator: true,
            },
            orderBy: {
                isAdmin: 'desc',
            },
            take: 50,
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('[USERS_API_GET]', error);
        return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        // Only Admins can change roles
        const auth = await ensureAdmin(req);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await req.json();
        const { userId, isAdmin, isModerator } = body;

        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
        }

        const updateData: any = {};
        if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
        if (isModerator !== undefined) updateData.isModerator = isModerator;

        // Prevent self-demotion
        if (userId === (auth.user as any).id && isAdmin === false) {
            return NextResponse.json({ error: 'Você não pode remover suas próprias permissões de admin' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('[USERS_API_PATCH]', error);
        return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
    }
}
