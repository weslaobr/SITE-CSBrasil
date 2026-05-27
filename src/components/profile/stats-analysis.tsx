"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatItemProps {
    label: string;
    value: string | number;
    unit?: string;
    index: number;
    color?: string;
}

const METADATA: Record<string, { color: string; goodIf: 'high' | 'low'; icon?: string }> = {
    "Tempo para Dano": { color: "#f59e0b", goodIf: "low" },
    "Tempo de Reação": { color: "#f59e0b", goodIf: "low" },
    "Posicionamento da Mira": { color: "#3b82f6", goodIf: "high" },
    "Pré-mira": { color: "#8b5cf6", goodIf: "high" },
    "K/D Ratio": { color: "#22c55e", goodIf: "high" },
    "ADR": { color: "#22c55e", goodIf: "high" },
    "Precisão de Mira": { color: "#22c55e", goodIf: "high" },
    "Precisão na Cabeça": { color: "#ef4444", goodIf: "high" },
    "Kills Varadas %": { color: "#a855f7", goodIf: "high" },
    "Kills na Smoke %": { color: "#a855f7", goodIf: "high" },
    "HLTV Rating 2.0": { color: "#22c55e", goodIf: "high" },
    "KAST": { color: "#22c55e", goodIf: "high" },
};

function getMeta(label: string) {
    return METADATA[label] || { color: "#22c55e", goodIf: "high" };
}

const calculateProgress = (label: string, value: number) => {
    const val = Number(value) || 0;
    switch (label) {
        case "Tempo para Dano": return Math.min(100, Math.max(0, 100 - ((val - 300) / 700) * 100));
        case "Tempo de Reação": return Math.min(100, Math.max(0, 100 - ((val - 200) / 300) * 100));
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

const StatItem: React.FC<StatItemProps> = ({ label, value, unit, index, color }) => {
    const progress = calculateProgress(label, Number(value));
    const meta = getMeta(label);
    const barColor = color || meta.color;
    const displayUnit = unit || '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group"
        >
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: barColor }} />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black italic tracking-tight" style={{ color: barColor }}>
                        {value}{displayUnit && <span className="text-[8px] font-bold opacity-60 ml-0.5">{displayUnit}</span>}
                    </span>
                    {progress >= 70 ? (
                        <TrendingUp size={10} className="text-emerald-500" />
                    ) : progress >= 40 ? (
                        <Minus size={10} className="text-yellow-500" />
                    ) : (
                        <TrendingDown size={10} className="text-red-500" />
                    )}
                </div>
            </div>
            <div className="relative w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, progress)}%` }}
                    transition={{ duration: 1, delay: 0.1 + index * 0.03, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: `linear-gradient(90deg, ${barColor}60, ${barColor})`,
                        boxShadow: `0 0 6px ${barColor}40`,
                    }}
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
        <div className="bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 rounded-[28px] border border-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-black italic uppercase tracking-tight text-white">Análise Estatística</h3>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[7px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-600 px-2 py-0.5 rounded-md border border-white/5">
                    Leetify IA
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
                {items.map((item, i) => (
                    <StatItem key={item.label} label={item.label} value={item.value} unit={item.unit} index={i} />
                ))}
            </div>
        </div>
    );
};

export default StatsAnalysis;
