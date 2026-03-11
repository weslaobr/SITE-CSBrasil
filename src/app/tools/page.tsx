"use client";

import SmokesHub from "@/components/tools/smokes-hub";
import EconomyCalculator from "@/components/tools/economy-calculator";

export default function ToolsPage() {
    return (
        <div className="p-8 space-y-20">
            <section>
                <div className="mb-10">
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Utilities & Tools</h1>
                    <p className="text-zinc-500">Recursos para melhorar seu jogo.</p>
                </div>
                <SmokesHub />
            </section>

            <div className="border-t border-white/5"></div>

            <section>
                <EconomyCalculator />
            </section>
        </div>
    );
}
