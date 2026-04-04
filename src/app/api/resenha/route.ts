import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const list = await prisma.evaluationList.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        creator: {
          select: {
            name: true,
            image: true,
            steamId: true,
          },
        },
        _count: {
          select: { evaluations: true },
        },
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("[RESENHA_GET]", error);
    return NextResponse.json({ error: "Erro ao buscar listas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const { title, description, isPublic } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const list = await prisma.evaluationList.create({
      data: {
        title,
        description,
        isPublic: isPublic !== false,
        creatorId: user.id,
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("[RESENHA_POST]", error);
    return NextResponse.json({ error: "Erro ao criar lista." }, { status: 500 });
  }
}
