"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ShieldAlert, Clock, Package, Trophy, User } from 'lucide-react';

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
    icon: React.ReactNode, 
    label: string, 
    value: number | string, 
    tooltip: string,
    isPenalty?: boolean
}> = ({ icon, label, value, tooltip, isPenalty }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className={`relative flex items-center justify-between text-[9px] font-bold uppercase tracking-wider p-2 rounded-lg border transition-colors ${
                isPenalty 
                ? 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/10' 
                : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className="flex items-center gap-1.5">{icon} {label}</span>
            <span className={isPenalty ? 'text-red-500' : 'text-emerald-500'}>
                {typeof value === 'number' && value > 0 ? `+${value}` : value}
            </span>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 pointer-events-none"
                    >
                        <p className="text-[10px] leading-relaxed normal-case font-medium text-zinc-300">
                            {tooltip}
                        </p>
                        <div className="absolute top-full left-4 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 transform rotate-45 -translate-y-1" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TrustCriteria: React.FC<TrustCriteriaProps> = ({ breakdown }) => {
    if (!breakdown) return null;

    return (
        <div className="mt-8 pt-8 border-t border-white/5 w-full">
            <div className="flex items-center gap-2 mb-4">
                <Info size={14} className="text-zinc-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Distribuição de Pontos</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <Criterion 
                    icon={<Clock size={10} />} 
                    label="Idade Conta" 
                    value={breakdown.age} 
                    tooltip="Ganha +2.5 pontos por cada ano de conta Steam. Máximo de +25 pontos."
                />
                <Criterion 
                    icon={<Package size={10} />} 
                    label="Inventário" 
                    value={breakdown.inventory} 
                    tooltip="Baseado no valor total dos itens. >$500=+20, >$100=+10, >$20=+5."
                />
                <Criterion 
                    icon={<User size={10} />} 
                    label="Nível Steam" 
                    value={breakdown.level} 
                    tooltip="Baseado no nível da sua conta. Lvl 50+=+10, Lvl 20+=+7, Lvl 10+=+5."
                />
                <Criterion 
                    icon={<Trophy size={10} />} 
                    label="Perf. IA" 
                    value={breakdown.leetify} 
                    tooltip="Análise de habilidade pelo Leetify. Rating 1.2+=+10, Rating 0.8+=+5."
                />
                <div className="col-span-2">
                    <Criterion 
                        icon={<ShieldAlert size={10} />} 
                        label="Penalidades (Bans)" 
                        value={breakdown.penalties} 
                        tooltip="Bans ativos reduzem drasticamente o Trust. VAC: -60, Community: -30, Economy: -20."
                        isPenalty={breakdown.penalties < 0}
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between px-2 py-1.5 bg-zinc-800/30 rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                <span>Pontuação Base</span>
                <span className="text-white">+50</span>
            </div>
        </div>
    );
};

export default TrustCriteria;
