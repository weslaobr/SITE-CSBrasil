"use client";
import React, { useState } from 'react';
import { DollarSign, Shield, Zap, AlertTriangle } from 'lucide-react';

const EconomyCalculator: React.FC = () => {
    const [lossStreak, setLossStreak] = useState(0);
    const [currentMoney, setCurrentMoney] = useState(800);

    const LOSS_BONUS = [1400, 1900, 2400, 2900, 3400];
    const nextRoundMoney = currentMoney + (LOSS_BONUS[lossStreak] || 3400);

    return (
        <div className="p-8 bg-zinc-950 text-white min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <h2 className="text-2xl font-black italic tracking-tighter">CALCULADORA DE ECONOMIA</h2>
                    <p className="text-zinc-500">Planeje seu próximo round baseado no bônus de derrota e saldo atual.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Inputs Section */}
                    <div className="space-y-6">
                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
                            <label className="block text-xs font-bold uppercase text-zinc-500 mb-4 tracking-widest">Saldo Atual</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 w-5 h-5" />
                                <input
                                    type="number"
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-2xl font-black text-white focus:border-yellow-500 outline-none"
                                    value={currentMoney}
                                    onChange={(e) => setCurrentMoney(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
                            <label className="block text-xs font-bold uppercase text-zinc-500 mb-4 tracking-widest">Sequência de Derrotas (Max: 4)</label>
                            <div className="flex gap-2">
                                {[0, 1, 2, 3, 4].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setLossStreak(num)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${lossStreak === num ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-zinc-950 text-zinc-500 border border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="bg-zinc-900 border border-yellow-500/20 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <DollarSign size={200} />
                        </div>

                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Resultado Possível</p>
                            <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">
                                ${nextRoundMoney.toLocaleString()}
                            </h2>
                            <p className="text-yellow-500 font-bold text-sm">
                                Bônus: +${LOSS_BONUS[lossStreak] || 3400}
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm font-bold text-zinc-300">Full Buy (AK/M4 + Kevlar)</span>
                                </div>
                                <span className={`text-sm font-bold ${nextRoundMoney >= 3900 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {nextRoundMoney >= 3900 ? 'POSSÍVEL' : 'INSUFICIENTE'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-orange-400" />
                                    <span className="text-sm font-bold text-zinc-300">Force Buy (Galil/Famas)</span>
                                </div>
                                <span className={`text-sm font-bold ${nextRoundMoney >= 2800 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {nextRoundMoney >= 2800 ? 'POSSÍVEL' : 'INSUFICIENTE'}
                                </span>
                            </div>
                        </div>

                        {nextRoundMoney < 2000 && (
                            <div className="mt-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
                                <p className="text-xs text-red-200">Economia crítica. Recomendado round ECO total.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EconomyCalculator;
