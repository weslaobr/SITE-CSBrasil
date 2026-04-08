import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const grouped = await prisma.playerEvaluation.groupBy({
      by: ["evaluatedSteamId", "evaluatedPlayerName"],
      _avg: {
        aimScore: true,
        utilityScore: true,
        positioningScore: true,
        duelScore: true,
        clutchScore: true,
        decisionScore: true,
        overallScore: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _avg: {
          overallScore: "desc",
        },
      },
    });

    const steamIds = grouped.map(g => g.evaluatedSteamId).filter(Boolean) as string[];

    const players = await prisma.player.findMany({
      where: { steamId: { in: steamIds } },
      select: { steamId: true, steamAvatar: true },
    });

    const users = await prisma.user.findMany({
      where: { steamId: { in: steamIds } },
      select: { steamId: true, image: true },
    });

    const avatarMap = new Map();
    steamIds.forEach(sid => {
      const user = users.find(u => u.steamId === sid);
      const player = players.find(p => p.steamId === sid);
      avatarMap.set(sid, user?.image || player?.steamAvatar || null);
    });

    const ranking = grouped.map((item: any) => ({
      steamId: item.evaluatedSteamId,
      playerName: item.evaluatedPlayerName,
      reviewsCount: item._count.id,
      avgAim: item._avg.aimScore,
      avgUtility: item._avg.utilityScore,
      avgPositioning: item._avg.positioningScore,
      avgDuel: item._avg.duelScore,
      avgClutch: item._avg.clutchScore,
      avgDecision: item._avg.decisionScore,
      avgOverall: item._avg.overallScore,
      avatar: item.evaluatedSteamId ? avatarMap.get(item.evaluatedSteamId) : null,
    }));

    // Filter out edge cases (though null scores shouldn't happen)
    const validRanking = ranking.filter((r: any) => r.avgOverall !== null);

    return NextResponse.json(validRanking);
  } catch (error) {
    console.error("[RESENHA_RANKING_GET]", error);
    return NextResponse.json({ error: "Erro ao buscar o ranking." }, { status: 500 });
  }
}
