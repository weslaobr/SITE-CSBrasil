import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const list = await prisma.evaluationList.findUnique({
      where: { id: p.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        evaluations: {
          orderBy: {
            overallScore: "desc",
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("[RESENHA_ID_GET]", error);
    return NextResponse.json({ error: "Erro ao buscar a lista." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const p = await params;
    const list = await prisma.evaluationList.findUnique({
      where: { id: p.id },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (list.creatorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.evaluationList.delete({
      where: { id: p.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESENHA_ID_DELETE]", error);
    return NextResponse.json({ error: "Erro ao deletar a lista." }, { status: 500 });
  }
}
