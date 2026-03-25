"use client";

import { Trophy } from "lucide-react";
import GlobalRanking from "@/components/dashboard/global-ranking";

export default function RankingPage() {
    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Trophy size={22} />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Ranking Global</h1>
                    </div>
                    <p className="text-zinc-500 text-sm pl-[52px]">Os jogadores de maior elite da Tropa do CS2.</p>
                </div>
            </div>

            <GlobalRanking />
        </div>
    );
}
