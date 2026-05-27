"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Gamepad2, Package, TrendingUp, Award } from 'lucide-react';

interface ReputationCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    index: number;
}

const ReputationCard: React.FC<ReputationCardProps> = ({ icon, label, value, color, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="flex items-center gap-2.5 bg-zinc-900/40 rounded-[14px] border border-white/5 p-2.5 group hover:bg-zinc-900/60 transition-all"
    >
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center border flex-shrink-0"
            style={{ background: `${color}10`, borderColor: `${color}20`, color }}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-black italic text-white leading-none">{value}</p>
            <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    </motion.div>
);

interface AccountReputationProps {
    data: {
        accountAge: string;
        hoursPlayed: string;
        inventoryValue: string;
        steamLevel: number;
        collectibles: number;
    };
}

const AccountReputation: React.FC<AccountReputationProps> = ({ data }) => {
    const cards = [
        { icon: <Clock size={12} />, label: "Idade da Conta", value: data.accountAge, color: "#22c55e" },
        { icon: <Gamepad2 size={12} />, label: "Horas de CS2", value: data.hoursPlayed, color: "#3b82f6" },
        { icon: <Package size={12} />, label: "Valor do Inventário", value: data.inventoryValue, color: "#f59e0b" },
        { icon: <TrendingUp size={12} />, label: "Nível na Steam", value: `Nv ${data.steamLevel}`, color: "#a855f7" },
        { icon: <Award size={12} />, label: "Colecionáveis", value: data.collectibles, color: "#ec4899" },
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black italic uppercase tracking-tight text-white">Reputação da Conta</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
                {cards.map((card, i) => (
                    <ReputationCard key={card.label} {...card} index={i} />
                ))}
            </div>
        </div>
    );
};

export default AccountReputation;
