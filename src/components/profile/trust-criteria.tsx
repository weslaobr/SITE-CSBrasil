"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Clock, Package, Trophy, User } from 'lucide-react';

interface TrustBreakdown {
    base: number;
    age: number;
    inventory: number;
    level: number;
    leetify: number;
    penalties: number;
}

interface TrustCriteriaProps {
    breakdown?: TrustBreakdown;
}

const Criterion: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    tooltip: string;
    isPenalty?: boolean;
}> = ({ icon, label, value, tooltip, isPenalty }) => {
    const [hover, setHover] = useState(false);
    return (
        <div
            className={`relative flex items-center justify-between text-[8px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border transition-colors ${
                isPenalty
                    ? 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/10'
                    : 'bg-zinc-800/30 border-white/5 text-zinc-500 hover:bg-zinc-800/50'
            }`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <span className="flex items-center gap-1">{icon} {label}</span>
            <span className={isPenalty ? 'text-red-500' : 'text-emerald-500 text-[9px]'}>
                {typeof value === 'number' && value > 0 ? `+${value}` : value}
            </span>
            <AnimatePresence>
                {hover && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-1.5 w-40 p-2 bg-zinc-950 border border-white/10 rounded-lg shadow-2xl z-50 pointer-events-none"
                    >
                        <p className="text-[8px] leading-relaxed normal-case font-medium text-zinc-300">{tooltip}</p>
                        <div className="absolute top-full left-3 w-1.5 h-1.5 bg-zinc-950 border-r border-b border-white/10 transform rotate-45 -translate-y-0.5" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TrustCriteria: React.FC<TrustCriteriaProps> = ({ breakdown }) => {
    if (!breakdown) return null;

    return (
        <div className="w-full">
            <div className="grid grid-cols-2 gap-1.5">
                <Criterion icon={<Clock size={8} />} label="Idade" value={breakdown.age}
                    tooltip="+2.5 pts/ano de conta Steam. Máx +25." />
                <Criterion icon={<Package size={8} />} label="Inventário" value={breakdown.inventory}
                    tooltip=">$500=+20, >$100=+10, >$20=+5." />
                <Criterion icon={<User size={8} />} label="Nível" value={breakdown.level}
                    tooltip="Lvl 50+=+10, Lvl 20+=+7, Lvl 10+=+5." />
                <Criterion icon={<Trophy size={8} />} label="IA" value={breakdown.leetify}
                    tooltip="Rating 1.2+=+10, 0.8+=+5." />
                <div className="col-span-2">
                    <Criterion icon={<ShieldAlert size={8} />} label="Penalidades" value={breakdown.penalties}
                        tooltip="VAC: -60, Community: -30, Economy: -20." isPenalty={breakdown.penalties < 0} />
                </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-2 py-1 bg-zinc-800/20 rounded-lg text-[7px] font-bold uppercase tracking-widest text-zinc-600">
                <span>Base</span>
                <span className="text-white">+50</span>
            </div>
        </div>
    );
};

export default TrustCriteria;
