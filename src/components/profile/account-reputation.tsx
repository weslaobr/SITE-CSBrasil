"use client";

import React from 'react';

interface ReputationCardProps {
    label: string;
    value: string | number;
    trend?: string;
}

const ReputationCard: React.FC<ReputationCardProps> = ({ label, value, trend }) => (
    <div className="bg-zinc-950/80 p-5 rounded-[24px] border border-white/5 hover:bg-zinc-900 transition-colors group">
        <div className="flex justify-between items-start mb-4">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest group-hover:text-emerald-500 transition-colors">{label}</p>
            {trend && <span className="text-[9px] font-black tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">{trend}</span>}
        </div>
        <p className="text-xl font-black italic text-white uppercase tracking-tight">{value}</p>
    </div>
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
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Reputação da Conta
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <ReputationCard label="Idade da Conta" value={data.accountAge} trend="+2.5%" />
                <ReputationCard label="Horas de CS2" value={data.hoursPlayed} trend="+0.4%" />
                <ReputationCard label="Valor do Inventário" value={data.inventoryValue} trend="+1.3%" />
                <ReputationCard label="Nível na Steam" value={`Nível ${data.steamLevel}`} trend="+0.0%" />
                <ReputationCard label="Colecionáveis" value={data.collectibles} trend="+1.2%" />
            </div>
        </div>
    );
};

export default AccountReputation;
