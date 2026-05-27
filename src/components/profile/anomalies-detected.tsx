"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Skull, Ban, Clock, AlertCircle } from 'lucide-react';

interface Anomaly {
    id: string;
    title: string;
    status: string;
    description: string;
}

interface AnomaliesDetectedProps {
    anomalies: Anomaly[];
}

const ANOMALY_ICONS: Record<string, React.ReactNode> = {
    'vac_ban': <Ban size={16} />,
    'game_ban': <Ban size={16} />,
    'inactivity': <Clock size={16} />,
    'rank_discrepancy': <AlertCircle size={16} />,
};

const AnomaliesDetected: React.FC<AnomaliesDetectedProps> = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-b from-zinc-900/30 to-zinc-900/10 rounded-[24px] border border-white/5 p-5 backdrop-blur-xl"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-emerald-500/10 rounded-[14px] flex items-center justify-center border border-emerald-500/20">
                            <ShieldCheck size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-black italic tracking-tight text-emerald-500">Nenhuma Anomalia</p>
                            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Conta saudável</p>
                        </div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        Limpo
                    </span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 rounded-[28px] border border-white/5 p-6 backdrop-blur-xl"
        >
            <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Anomalias
                </h3>
                <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {anomalies.length} detectada{anomalies.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {anomalies.map((anomaly, i) => {
                    const isCritical = anomaly.status === 'Critical';
                    const statusColor = isCritical ? '#ef4444' : '#f59e0b';
                    const statusBg = isCritical ? 'bg-red-500/10' : 'bg-amber-500/10';
                    const statusBorder = isCritical ? 'border-red-500/20' : 'border-amber-500/20';
                    const statusText = isCritical ? 'text-red-500' : 'text-amber-500';

                    return (
                        <motion.div
                            key={anomaly.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative bg-zinc-900/50 rounded-[18px] border border-white/5 p-4 group hover:bg-zinc-900/70 transition-all overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: statusColor }} />
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 border ${statusBg} ${statusBorder}`}>
                                    <span className={statusText}>
                                        <Skull size={16} />
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-black italic text-white tracking-tight truncate">{anomaly.title}</p>
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border flex-shrink-0 ${statusBg} ${statusBorder} ${statusText}`}>
                                            {isCritical ? 'Crítico' : 'Aviso'}
                                        </span>
                                    </div>
                                    <p className="text-[8px] text-zinc-600 font-bold mt-1 leading-relaxed">{anomaly.description}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default AnomaliesDetected;
