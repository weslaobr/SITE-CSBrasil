import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const p = await params;
    const list = await prisma.evaluationList.findUnique({
      where: { id: p.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.creatorId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const {
      evaluatedSteamId,
      aimScore,
      utilityScore,
      positioningScore,
      duelScore,
      clutchScore,
      decisionScore,
      notes,
    } = data;

    // The user requested that the evaluated player MUST be in the database
    // We will look up the User by Steam ID
    const evaluatedUser = await prisma.user.findFirst({
      where: { steamId: evaluatedSteamId },
    });

    // Alternatively, look in Player
    const evaluatedPlayer = await prisma.player.findFirst({
      where: { steamId: evaluatedSteamId },
    });

    if (!evaluatedUser && !evaluatedPlayer) {
       return NextResponse.json({ error: "O jogador avaliado não foi encontrado no banco de dados." }, { status: 400 });
    }

    const evaluatedPlayerName = evaluatedUser?.name || evaluatedPlayer?.steamName || evaluatedSteamId;

    const overallScore = (
      Number(aimScore) +
      Number(utilityScore) +
      Number(positioningScore) +
      Number(duelScore) +
      Number(clutchScore) +
      Number(decisionScore)
    ) / 6;

    const evaluation = await prisma.playerEvaluation.create({
      data: {
        listId: p.id,
        evaluatedPlayerName,
        evaluatedSteamId,
        aimScore: Number(aimScore),
        utilityScore: Number(utilityScore),
        positioningScore: Number(positioningScore),
        duelScore: Number(duelScore),
        clutchScore: Number(clutchScore),
        decisionScore: Number(decisionScore),
        overallScore,
        notes,
      },
    });

    return NextResponse.json(evaluation);
  } catch (error: any) {
    console.error("[RESENHA_PLAYERS_POST]", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Jogador já avaliado nesta lista." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar avaliação." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const p = await params;
    const url = new URL(req.url);
    const evaluationId = url.searchParams.get("evaluationId");

    if (!evaluationId) {
      return NextResponse.json({ error: "Missing evaluation ID" }, { status: 400 });
    }

    const evaluation = await prisma.playerEvaluation.findUnique({
      where: { id: evaluationId },
      include: { list: true },
    });

    if (!evaluation || evaluation.listId !== p.id) {
       return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (evaluation.list.creatorId !== currentUser.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.playerEvaluation.delete({
      where: { id: evaluationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESENHA_PLAYERS_DELETE]", error);
    return NextResponse.json({ error: "Erro ao deletar avaliação." }, { status: 500 });
  }
}
