import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assetId, marketHashName, paidPrice } = body;
        
        console.log("[SAVE-PRICE] Request received:", { assetId, marketHashName, paidPrice });

        if (!assetId || !marketHashName) {
            console.error("[SAVE-PRICE] Missing required fields:", { assetId, marketHashName });
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        
        if (!userId) {
            console.error("[SAVE-PRICE] User ID not found in session. Session user:", session.user);
            return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
        }

        const priceValue = typeof paidPrice === 'string' ? parseFloat(paidPrice.replace(',', '.')) : paidPrice;

        console.log(`[SAVE-PRICE] User ${userId} saving price for asset ${assetId}`);

        try {
            // Tentar buscar item existente usando a chave única composta
            const existing = await prisma.userInventoryItem.findUnique({
                where: {
                    userId_assetId: {
                        userId,
                        assetId,
                    },
                },
            });

            let result;
            if (existing) {
                console.log("[SAVE-PRICE] Updating existing record ID:", existing.id);
                result = await prisma.userInventoryItem.update({
                    where: { id: existing.id },
                    data: {
                        paidPrice: priceValue || 0,
                        marketHashName,
                    },
                });
            } else {
                console.log("[SAVE-PRICE] Creating new record");
                result = await prisma.userInventoryItem.create({
                    data: {
                        userId,
                        assetId,
                        marketHashName,
                        paidPrice: priceValue || 0,
                    },
                });
            }

            console.log("[SAVE-PRICE] Success!");
            return NextResponse.json({ success: true, item: result });
        } catch (dbError: any) {
            console.error("[SAVE-PRICE] Database operation failed:", dbError.message);
            throw dbError; // Será capturado pelo catch externo
        }
    } catch (error: any) {
        console.error("CRITICAL ERROR in save-price:", error.message);
        console.error("Stack:", error.stack);
        return NextResponse.json(
            { error: "Failed to save purchase price" },
            { status: 500 }
        );
    }
}
