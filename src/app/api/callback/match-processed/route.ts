import { NextRequest, NextResponse } from "next/server";
import { calculateMatchTropoints } from "@/services/ranking-service";

export async function POST(req: NextRequest) {
    try {
        const { matchId } = await req.json();

        if (!matchId) {
            return NextResponse.json({ error: "matchId is required" }, { status: 400 });
        }

        console.log(`[Callback] Processing ranking for match: ${matchId}`);
        
        // Calculate points for the match
        try {
            const result = await calculateMatchTropoints(matchId);
            return NextResponse.json({ 
                success: true, 
                message: "Ranking updated successfully",
                details: result 
            });
        } catch (calcError: any) {
            console.warn(`[Callback] Ranking calculation failed for ${matchId}: ${calcError.message}`);
            // Still return 200 because the analyzer shouldn't retry if the match isn't valid for ranking
            return NextResponse.json({ 
                success: false, 
                message: calcError.message 
            });
        }
    } catch (error: any) {
        console.error("[Callback] Match processed callback error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
