"use client";

import { Trophy } from "lucide-react";
import GlobalRanking from "@/components/dashboard/global-ranking";

export default function RankingPage() {
    return (
        <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">

            {/* ── HERO HEADER ────────────────────────────────────────────── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                {/* Background glow */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
                            <Trophy className="text-yellow-500 w-7 h-7 drop-shadow-[0_0_8px_rgba(246,203,2,0.6)]" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Ranking</span>
                                <span className="text-yellow-500"> Global</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-yellow-500/40" />
                                Elite do CS2
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-zinc-500">Top jugadores da Tropa</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <GlobalRanking />
        </div>
    );
}
