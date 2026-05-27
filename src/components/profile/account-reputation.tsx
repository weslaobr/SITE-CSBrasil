"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Gamepad2, Package, TrendingUp, Award } from 'lucide-react';

interface ReputationCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    trend?: string;
    index: number;
    color: string;
}

const ReputationCard: React.FC<ReputationCardProps> = ({ icon, label, value, trend, index, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="relative overflow-hidden bg-zinc-900/40 rounded-[20px] border border-white/5 p-4 group hover:bg-zinc-900/60 transition-all"
    >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: `${color}08`, filter: 'blur(30px)' }} />
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
                    style={{ background: `${color}10`, borderColor: `${color}25`, color }}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border"
                        style={{ background: `${color}10`, borderColor: `${color}20`, color }}>
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-lg font-black italic text-white tracking-tight">{value}</p>
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{label}</p>
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
        { icon: <Clock size={14} />, label: "Idade da Conta", value: data.accountAge, trend: "+2.5%", color: "#22c55e" },
        { icon: <Gamepad2 size={14} />, label: "Horas de CS2", value: data.hoursPlayed, trend: "+0.4%", color: "#3b82f6" },
        { icon: <Package size={14} />, label: "Valor do Inventário", value: data.inventoryValue, trend: "+1.3%", color: "#f59e0b" },
        { icon: <TrendingUp size={14} />, label: "Nível na Steam", value: `Nível ${data.steamLevel}`, trend: "+0.0%", color: "#a855f7" },
        { icon: <Award size={14} />, label: "Colecionáveis", value: data.collectibles, trend: "+1.2%", color: "#ec4899" },
    ];

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-emerald-500" />
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">Reputação da Conta</h3>
                <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map((card, i) => (
                    <ReputationCard key={card.label} {...card} index={i} />
                ))}
            </div>
        </div>
    );
};

export default AccountReputation;
