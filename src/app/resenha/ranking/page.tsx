"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Trophy, Star, Shield, Crosshair, Zap, Activity, Brain } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ResenhaRankingPage() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const res = await fetch("/api/resenha/ranking");
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32 max-w-6xl mx-auto">
      {/* HEADER */}
      <header className="relative bg-zinc-900/60 p-8 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-start gap-4">
          <Link href="/resenha" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
            <ArrowLeft size={14} /> Voltar
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
              <Trophy className="text-yellow-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
                Ranking <span className="text-yellow-500">Global</span>
              </h1>
              <p className="text-zinc-400 mt-2 text-sm max-w-xl">
                A média geral dos jogadores baseada em todas as avaliações feitas pela comunidade na plataforma.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TABLE DATA */}
      <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin text-yellow-500 w-10 h-10" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Trophy size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
              Nenhum jogador avaliado ainda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 bg-black/40">
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center w-16">#</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Jogador</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center">Avals</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Mira"><Crosshair size={14} className="mx-auto" /></th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Utilitários"><Shield size={14} className="mx-auto" /></th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Posicionamento">Pos</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Duelos"><Zap size={14} className="mx-auto" /></th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Clutch"><Activity size={14} className="mx-auto" /></th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-center" title="Decisão"><Brain size={14} className="mx-auto" /></th>
                  <th className="p-4 text-xs font-black text-yellow-500 uppercase tracking-wider text-right">Nota Global</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranking.map((player, index) => {
                  const isTop3 = index < 3;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={player.steamId} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="p-4 text-center">
                        {index === 0 ? <span className="text-yellow-400 font-black text-lg">1</span> :
                         index === 1 ? <span className="text-zinc-300 font-black text-lg">2</span> :
                         index === 2 ? <span className="text-orange-400 font-black text-lg">3</span> :
                         <span className="text-zinc-600 font-bold">{index + 1}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs ${isTop3 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}>
                            {player.playerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors">{player.playerName}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">Steam: {player.steamId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-xs font-bold text-zinc-400">{player.reviewsCount}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgAim).toFixed(1)}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgUtility).toFixed(1)}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgPositioning).toFixed(1)}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgDuel).toFixed(1)}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgClutch).toFixed(1)}</td>
                      <td className="p-4 text-center text-sm font-mono text-zinc-300">{Number(player.avgDecision).toFixed(1)}</td>
                      <td className="p-4 text-right">
                        <span className="bg-yellow-500 text-black font-black italic text-base px-3 py-1 rounded w-16 inline-block text-center shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                          {Number(player.avgOverall).toFixed(1)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
