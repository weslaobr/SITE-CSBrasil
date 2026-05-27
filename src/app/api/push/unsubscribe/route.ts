import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions(req));
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint é obrigatório" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PushUnsubscribe] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
