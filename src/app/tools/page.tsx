"use client";

import { Wind } from "lucide-react";
import SmokesHub from "@/components/tools/smokes-hub";
import EconomyCalculator from "@/components/tools/economy-calculator";

export default function ToolsPage() {
    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Wind size={22} />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Utilidades & Ferramentas</h1>
                    </div>
                    <p className="text-zinc-500 text-sm pl-[52px]">Recursos para melhorar seu jogo e se preparar melhor.</p>
                </div>
            </div>

            {/* Smokes Hub */}
            <section>
                <SmokesHub />
            </section>

            <div className="border-t border-white/5" />

            {/* Economy Calculator */}
            <section>
                <EconomyCalculator />
            </section>
        </div>
    );
}
