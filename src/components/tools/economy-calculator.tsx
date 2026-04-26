"use client";
import React, { useState } from 'react';
import { DollarSign, Shield, Zap, AlertTriangle, Crosshair, TrendingUp, Wallet, ShoppingCart } from 'lucide-react';

const EconomyCalculator: React.FC = () => {
    const [lossStreak, setLossStreak] = useState(0);
    const [currentMoney, setCurrentMoney] = useState(800);
    const [kills, setKills] = useState(0);

    const LOSS_BONUS = [1400, 1900, 2400, 2900, 3400];
    const killReward = kills * 300; // Standard rifle reward
    const totalNextRound = currentMoney + (LOSS_BONUS[lossStreak] || 3400) + killReward;

    const buys = [
        { name: 'Full Buy (AK/M4 + Full Utilitários)', cost: 4700, icon: <Shield className="w-4 h-4" color="#a855f7" /> },
        { name: 'Standard Buy (AK/M4 + Kevlar)', cost: 3900, icon: <Shield className="w-4 h-4" color="#eab308" /> },
        { name: 'Force Buy (Galil/Famas)', cost: 2800, icon: <Zap className="w-4 h-4" color="#f97316" /> },
        { name: 'Semi-Eco (Pistol + Kevlar)', cost: 1500, icon: <Crosshair className="w-4 h-4" color="#6366f1" /> },
    ];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Input Controls */}
            <div className="xl:col-span-4 space-y-6">
                <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                            <Wallet className="text-yellow-500 w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter">Entrada de Dados</h3>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-[0.2em]">Saldo Atual</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 w-5 h-5" />
                                <input
                                    type="number"
                                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-white focus:border-yellow-500 outline-none shadow-inner"
                                    value={currentMoney}
                                    onChange={(e) => setCurrentMoney(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-[0.2em]">Sequência de Derrotas</label>
                            <div className="grid grid-cols-5 gap-2">
                                {[0, 1, 2, 3, 4].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setLossStreak(num)}
                                        className={`py-3 rounded-xl font-black text-sm transition-all border ${
                                            lossStreak === num 
                                                ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/20' 
                                                : 'bg-zinc-950 text-zinc-600 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest text-center">Bônus: +${LOSS_BONUS[lossStreak]}</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-[0.2em]">Kills Estimadas (Próx. Round)</label>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="1"
                                value={kills}
                                onChange={(e) => setKills(Number(e.target.value))}
                                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <div className="flex justify-between mt-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                <span>0 Kills</span>
                                <span className="text-yellow-500">{kills} Kills (+${kills * 300})</span>
                                <span>5 Kills</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Display */}
            <div className="xl:col-span-8 space-y-6">
                <div className="bg-zinc-900 border border-yellow-500/10 rounded-[3rem] p-10 relative overflow-hidden flex flex-col md:flex-row gap-10">
                    <div className="absolute top-[-20px] right-[-20px] opacity-[0.02] rotate-12">
                        <TrendingUp size={300} />
                    </div>

                    <div className="flex-1 space-y-6 relative z-10">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-2">Poder de Compra Estimado</p>
                            <h2 className="text-7xl font-black text-white tracking-tighter mb-4">
                                <span className="text-yellow-500">$</span>{totalNextRound.toLocaleString()}
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                    Bonus: +${LOSS_BONUS[lossStreak]}
                                </span>
                                {killReward > 0 && (
                                    <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase text-yellow-500 tracking-widest">
                                        Kills: +${killReward}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 space-y-3">
                            <h4 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <ShoppingCart size={14} /> Análise de Compras
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {buys.map((buy, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-zinc-950 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            {buy.icon}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-zinc-300">{buy.name}</span>
                                                <span className="text-[9px] font-bold text-zinc-600">${buy.cost}</span>
                                            </div>
                                        </div>
                                        <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                                            totalNextRound >= buy.cost ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {totalNextRound >= buy.cost ? 'OK' : 'Falta $' + (buy.cost - totalNextRound)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:w-64 bg-zinc-950/50 border border-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center relative z-10">
                        {totalNextRound >= 4700 ? (
                            <>
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Shield className="text-green-500 w-8 h-8" />
                                </div>
                                <p className="text-xs font-black uppercase text-green-500 tracking-widest mb-2">Economia Saudável</p>
                                <p className="text-[10px] text-zinc-500 font-medium">Você tem saldo suficiente para um Full Buy completo com utilitários.</p>
                            </>
                        ) : totalNextRound >= 3900 ? (
                            <>
                                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Shield className="text-yellow-500 w-8 h-8" />
                                </div>
                                <p className="text-xs font-black uppercase text-yellow-500 tracking-widest mb-2">Compra Padrão</p>
                                <p className="text-[10px] text-zinc-500 font-medium">Pode comprar Rifles e Colete, mas cuidado com os utilitários.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="text-red-500 w-8 h-8" />
                                </div>
                                <p className="text-xs font-black uppercase text-red-500 tracking-widest mb-2">Economia Crítica</p>
                                <p className="text-[10px] text-zinc-500 font-medium">Saldo insuficiente para buy padrão. Recomendado round ECO ou Force tático.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EconomyCalculator;
