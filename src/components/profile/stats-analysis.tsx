"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface StatItemProps {
    label: string;
    value: string | number;
    unit?: string;
    index: number;
}

const getProgressColor = (label: string, value: number) => {
    // Specific logic for colors if needed. For now, we'll use a consistent emerald green for good, red for bad, or standard.
    return "bg-emerald-500";
};

const calculateProgress = (label: string, value: number) => {
    const val = Number(value) || 0;
    switch (label) {
        case "Tempo para Dano": return Math.min(100, Math.max(0, 100 - ((val - 300) / 700) * 100)); // lower is better
        case "Tempo de Reação": return Math.min(100, Math.max(0, 100 - ((val - 200) / 300) * 100)); // lower is better
        case "Posicionamento da Mira": return Math.min(100, (val / 15) * 100);
        case "Pré-mira": return Math.min(100, (val / 15) * 100);
        case "K/D Ratio": return Math.min(100, (val / 2.0) * 100);
        case "ADR": return Math.min(100, (val / 150) * 100);
        case "Precisão de Mira": return Math.min(100, val);
        case "Precisão na Cabeça": return Math.min(100, val);
        case "Kills Varadas %": return Math.min(100, (val / 10) * 100);
        case "Kills na Smoke %": return Math.min(100, (val / 10) * 100);
        case "HLTV Rating 2.0": return Math.min(100, (val / 2.0) * 100);
        case "KAST": return Math.min(100, val);
        default: return 50;
    }
};

const StatItem: React.FC<StatItemProps> = ({ label, value, unit, index }) => {
    const progress = calculateProgress(label, Number(value));
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex flex-col justify-center py-2.5"
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black italic text-emerald-500">{value}</span>
                    {unit && <span className="text-[10px] font-black text-emerald-500/60 uppercase italic">{unit}</span>}
                </div>
                <span className="text-[10px] font-bold text-zinc-300">{label}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.2 + (index * 0.05) }}
                    className="h-full bg-emerald-500 rounded-full"
                />
                <div className="h-full border-l border-zinc-700 mx-px" />
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - progress}%` }}
                    className="h-full bg-red-900/20"
                />
            </div>
        </motion.div>
    );
};

interface StatsAnalysisProps {
    stats: any;
}

const StatsAnalysis: React.FC<StatsAnalysisProps> = ({ stats }) => {
    if (!stats) return null;

    const items = [
        { label: "Tempo para Dano", value: stats.timeToDamage, unit: "ms" },
        { label: "Tempo de Reação", value: stats.reactionTime, unit: "ms" },
        { label: "Posicionamento da Mira", value: stats.crosshairPlacement, unit: "°" },
        { label: "Pré-mira", value: stats.preaim, unit: "°" },
        { label: "K/D Ratio", value: stats.kdRatio },
        { label: "ADR", value: stats.adr },
        { label: "Precisão de Mira", value: stats.aimAccuracy, unit: "%" },
        { label: "Precisão na Cabeça", value: stats.headAccuracy, unit: "%" },
        { label: "Kills Varadas %", value: stats.wallbangKillPercentage, unit: "%" },
        { label: "Kills na Smoke %", value: stats.smokeKillPercentage, unit: "%" },
        { label: "HLTV Rating 2.0", value: stats.hltvRating2 },
        { label: "KAST", value: stats.kast, unit: "%" },
    ];

    return (
        <div className="bg-zinc-950/30 rounded-[32px] border border-white/5 p-8 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black italic tracking-widest text-zinc-300 flex items-center gap-3">
                    <span className="w-1 h-4 bg-emerald-500 rounded-full" /> Análise Estatística
                </h3>
                <span className="text-[9px] font-black uppercase bg-zinc-800 text-zinc-500 px-2 py-1 rounded-md border border-white/5">-0.4%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-4 mt-6">
                {items.map((item, i) => (
                    <StatItem key={item.label} label={item.label} value={item.value} unit={item.unit} index={i} />
                ))}
            </div>
        </div>
    );
};

export default StatsAnalysis;
