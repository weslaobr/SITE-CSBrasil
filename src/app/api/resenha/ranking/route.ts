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
    }));

    // Filter out edge cases (though null scores shouldn't happen)
    const validRanking = ranking.filter((r: any) => r.avgOverall !== null);

    return NextResponse.json(validRanking);
  } catch (error) {
    console.error("[RESENHA_RANKING_GET]", error);
    return NextResponse.json({ error: "Erro ao buscar o ranking." }, { status: 500 });
  }
}
