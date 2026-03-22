"use client";

import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Anomaly {
    id: string;
    title: string;
    status: string;
    description: string;
}

interface AnomaliesDetectedProps {
    anomalies: Anomaly[];
}

const AnomaliesDetected: React.FC<AnomaliesDetectedProps> = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) {
        return (
            <div className="bg-zinc-950/30 rounded-[32px] border border-white/5 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-[16px] flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                        <Info size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black italic uppercase tracking-wider text-emerald-500">Nenhuma Anomalia</h3>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-1">Comportamento de conta saudável detectado.</p>
                    </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-xl border border-emerald-500/20">Clean Player</span>
            </div>
        );
    }

    return (
        <div className="bg-zinc-950/30 rounded-[32px] border border-white/5 p-8 space-y-6">
            <h3 className="text-xs font-black italic uppercase tracking-widest text-zinc-400 flex items-center gap-3">
                <AlertTriangle size={16} className="text-amber-500" /> Anomalies Detected
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="flex flex-col p-5 bg-zinc-950/80 rounded-[24px] border border-white/5 group hover:border-amber-500/30 transition-all relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${anomaly.status === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${
                                anomaly.status === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                                <AlertCircle size={20} />
                            </div>
                            <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-md border ${
                                anomaly.status === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                                {anomaly.status}
                            </span>
                        </div>
                        <div>
                            <h4 className="text-sm font-black italic uppercase text-white tracking-tight">{anomaly.title}</h4>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1 tracking-widest">{anomaly.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnomaliesDetected;
