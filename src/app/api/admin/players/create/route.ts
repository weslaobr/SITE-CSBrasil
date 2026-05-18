import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUserStats } from "@/services/sync-service";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { steamId, discordId, nickname } = body;

        if (!steamId || !discordId) {
            return NextResponse.json({ 
                success: false, 
                error: "missing_fields", 
                message: "SteamID e DiscordID são obrigatórios." 
            }, { status: 400 });
        }

        const cleanSteamId = steamId.trim();
        if (!/^\d{17}$/.test(cleanSteamId)) {
            return NextResponse.json({ 
                success: false, 
                error: "invalid_steamid", 
                message: "SteamID64 deve ser um número válido de 17 dígitos." 
            }, { status: 400 });
        }

        // Check if player already exists
        const existingPlayer = await prisma.player.findFirst({
            where: {
                OR: [
                    { steamId: cleanSteamId },
                    { discordId: discordId }
                ]
            }
        });

        if (existingPlayer) {
            return NextResponse.json({ 
                success: false, 
                error: "already_exists", 
                message: "Um jogador com esta Steam ou Discord já está cadastrado." 
            }, { status: 400 });
        }

        // Create player in database
        const player = await prisma.player.create({
            data: {
                steamId: cleanSteamId,
                discordId: discordId,
                steamUrl: `https://steamcommunity.com/profiles/${cleanSteamId}`,
                steamName: nickname || `Player ${cleanSteamId.slice(-4)}`,
                updatedAt: new Date(),
                Stats: {
                    create: {
                        updatedAt: new Date(),
                        premierRating: 5000,
                        faceitLevel: 1,
                        faceitElo: 500
                    }
                }
            }
        });

        // Trigger stats sync in the background so they get rankings immediately
        try {
            await syncUserStats(cleanSteamId);
        } catch (syncErr) {
            console.error("Failed to sync stats during player creation:", syncErr);
        }

        return NextResponse.json({
            success: true,
            player
        });

    } catch (error: any) {
        console.error("Failed to create player:", error);
        return NextResponse.json({ 
            success: false, 
            error: "server_error", 
            message: error.message || "Erro interno do servidor." 
        }, { status: 500 });
    }
}
