import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID não configurado" }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}
