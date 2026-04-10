import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Busca por steamId exato primeiro (SteamID64 tem 17 dígitos)
        const isSteamId = /^\d{15,19}$/.test(query);

        if (isSteamId) {
            // Tentativa 1: no banco de User (logado)
            const user = await prisma.user.findFirst({
                where: { steamId: query },
                select: { steamId: true, name: true, image: true },
            });
            if (user) {
                return NextResponse.json({
                    results: [{ steamId: user.steamId, name: user.name, avatar: user.image }]
                });
            }

            // Tentativa 2: no banco de Player (sincronizado pelo bot)
            const player = await prisma.player.findFirst({
                where: { steamId: query },
                select: { steamId: true, steamName: true, steamAvatar: true },
            });
            if (player) {
                return NextResponse.json({
                    results: [{ steamId: player.steamId, name: player.steamName, avatar: player.steamAvatar }]
                });
            }

            // Não encontrado no banco, retorna direto para que o frontend navegue mesmo assim
            return NextResponse.json({
                results: [{ steamId: query, name: query, avatar: null, directNavigate: true }]
            });
        }

        // Busca por nome — primeiro em Users logados
        const users = await prisma.user.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
                steamId: { not: null },
            },
            select: { steamId: true, name: true, image: true },
            take: 8,
        });

        // Depois em Players do bot
        const players = await prisma.player.findMany({
            where: {
                steamName: { contains: query, mode: 'insensitive' },
            },
            select: { steamId: true, steamName: true, steamAvatar: true },
            take: 8,
        });

        // Combinar e deduplicar por steamId
        const seen = new Set<string>();
        const combined: { steamId: string; name: string | null; avatar: string | null }[] = [];

        for (const u of users) {
            if (u.steamId && !seen.has(u.steamId)) {
                seen.add(u.steamId);
                combined.push({ steamId: u.steamId!, name: u.name, avatar: u.image });
            }
        }
        for (const p of players) {
            if (p.steamId && !seen.has(p.steamId)) {
                seen.add(p.steamId);
                combined.push({ steamId: p.steamId, name: p.steamName, avatar: p.steamAvatar });
            }
        }

        return NextResponse.json({ results: combined.slice(0, 8) });

    } catch (error: any) {
        console.error('[Search API]', error.message);
        return NextResponse.json({ results: [] });
    }
}
