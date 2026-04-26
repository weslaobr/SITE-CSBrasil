"use client";

import React, { useState } from "react";
import { Wind, Calculator, Play, Target, Zap, Settings as SettingsIcon, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SmokesHub from "@/components/tools/smokes-hub";
import EconomyCalculator from "@/components/tools/economy-calculator";

import BindGenerator from "@/components/tools/bind-generator";
import CrosshairHub from "@/components/tools/crosshair-hub";

type ToolTab = "smokes" | "economy" | "binds" | "crosshairs";

export default function ToolsPage() {
    const [activeTab, setActiveTab] = useState<ToolTab>("smokes");

    const tabs = [
        { id: "smokes", label: "Smokes & Utilitários", icon: <Play size={18} />, color: "text-purple-400" },
        { id: "economy", label: "Calculadora de Eco", icon: <Calculator size={18} />, color: "text-yellow-500" },
        { id: "binds", label: "Gerador de Binds", icon: <Zap size={18} />, color: "text-orange-500" },
        { id: "crosshairs", label: "Miras dos Pros", icon: <Target size={18} />, color: "text-purple-500" },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

            {/* ── HERO HEADER ── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl relative group">
                            <div className="absolute inset-0 bg-yellow-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Wind className="text-yellow-500 w-7 h-7 relative z-10" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Arsenal de</span>
                                <span className="text-yellow-500"> Ferramentas</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-yellow-500/40" />
                                Elite Training Center
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-zinc-500">Recursos táticos avançados para a Tropa</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1.5 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-x-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ToolTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-[1.02]"
                                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden lg:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* ── TOOL CONTENT ── */}
            <main className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {activeTab === "smokes" && <SmokesHub />}
                        {activeTab === "economy" && <EconomyCalculator />}
                        {activeTab === "binds" && <BindGenerator />}
                        {activeTab === "crosshairs" && <CrosshairHub />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
