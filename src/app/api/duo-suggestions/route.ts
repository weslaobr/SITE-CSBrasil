import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions(req));
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const mySteamId = (session.user as any).steamId;
    if (!mySteamId) {
      return NextResponse.json({ error: "Sem Steam vinculada" }, { status: 400 });
    }

    const myUser = await prisma.user.findUnique({
      where: { steamId: mySteamId },
      select: { id: true, rankingPoints: true, mixLevel: true, faceitLevel: true, steamId: true }
    });
    if (!myUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 20);

    const myRating = myUser.rankingPoints || 500;
    const myMix = myUser.mixLevel || 5;

    const minRating = myRating - 500;
    const maxRating = myRating + 500;

    const candidates = await prisma.user.findMany({
      where: {
        AND: [
          { steamId: { not: null } },
          { steamId: { not: mySteamId } }
        ],
        rankingPoints: { gte: minRating, lte: maxRating },
        matchesPlayed: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        image: true,
        steamId: true,
        rankingPoints: true,
        mixLevel: true,
        faceitLevel: true,
        gcNickname: true,
        faceitNickname: true,
        matchesPlayed: true
      },
      orderBy: { matchesPlayed: "desc" },
      take: 30
    });

    const suggested = candidates.map((c) => {
      const cRating = c.rankingPoints || 500;
      const cMix = c.mixLevel || 5;

      const ratingDiff = Math.abs(cRating - myRating);
      const mixDiff = Math.abs(cMix - myMix);

      let score = 0;
      if (mixDiff === 0) score += 40;
      else if (mixDiff <= 1) score += 25;
      if (ratingDiff <= 50) score += 30;
      else if (ratingDiff <= 150) score += 20;
      else if (ratingDiff <= 300) score += 10;
      if (c.faceitLevel && myUser.faceitLevel && Math.abs(c.faceitLevel - myUser.faceitLevel) <= 1) score += 15;
      if (c.matchesPlayed > 20) score += 10;
      else if (c.matchesPlayed > 5) score += 5;

      return {
        userId: c.id,
        name: c.name || c.gcNickname || c.faceitNickname || "Unknown",
        avatar: c.image,
        steamId: c.steamId,
        rankingPoints: cRating,
        mixLevel: cMix,
        faceitLevel: c.faceitLevel,
        matchesPlayed: c.matchesPlayed,
        compatibilityScore: Math.round(score)
      };
    });

    suggested.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return NextResponse.json({
      suggestions: suggested.slice(0, limit),
      myRating,
      myMixLevel: myMix
    });
  } catch (error) {
    console.error("[DuoSuggestions] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
