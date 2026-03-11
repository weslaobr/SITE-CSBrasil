"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import OverviewCard from "@/components/csbrasil/overview-card";
import AttributesRadarChart from "@/components/csbrasil/radar-chart";
import MatchHistory from "@/components/csbrasil/match-history";
import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import MatchReviewModal from '@/components/csbrasil/match-review-modal';
import { Package, ShieldCheck, Trophy, Target, Zap } from 'lucide-react';

export default function PlayerProfilePage() {
    const params = useParams();
    const steamId = params.id as string;
    const { data: session } = useSession();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

    useEffect(() => {
        if (steamId) {
            setLoading(true);
            fetch(`/api/player/${steamId}`)
                .then(res => res.json())
                .then(json => {
                    setData(json);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [steamId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto" />
                    <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando Perfil...</p>
                </div>
            </div>
        );
    }

    if (!data || data.error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                    <h2 className="text-3xl font-black italic uppercase text-red-500">Perfil não encontrado</h2>
                    <p className="text-zinc-500">Não conseguimos localizar os dados desse jogador na Steam ou no Leetify.</p>
                    <button onClick={() => window.location.href = '/'} className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs">Voltar à Busca</button>
                </div>
            </div>
        );
    }

    const { profile, steamStats, dbUser, leetifyData, matches } = data;
    const isOwner = (session?.user as any)?.steamId === steamId;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-green-500 selection:text-black">
            <main className="max-w-7xl mx-auto p-8 space-y-12">
                {/* 1. Header Overview (Leetify Inspired) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <OverviewCard
                        player={{
                            name: profile.personaname,
                            avatarUrl: profile.avatarfull,
                            rating: leetifyData?.ratings?.leetifyRating || 0,
                            winRate: "54.2%", // Mocked or calculated
                            impact: (leetifyData?.ratings?.opening || 0) * 1.2,
                            rank: leetifyData?.ranks?.premier || 0,
                            faceitLevel: leetifyData?.ranks?.faceitLevel,
                            gamersClubLevel: leetifyData?.ranks?.gamersClubLevel,
                            steamId: steamId
                        }}
                    />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 2. Performance Section (Radar Chart) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-5"
                    >
                        <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl h-full">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-green-500 rounded-full" /> Perfil de Performance
                            </h3>
                            {leetifyData?.ratings ? (
                                <AttributesRadarChart data={leetifyData.ratings} />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-zinc-600 font-bold uppercase text-[10px] tracking-widest text-center">
                                    Aguardando processamento de IA do Leetify...
                                </div>
                            )}

                            <div className="mt-8 space-y-4">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                                    Baseado em mais de 100 partidas processadas pelo motor de IA do CSBRASIL.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. Match History Section */}
                    <div className="lg:col-span-7">
                        <MatchHistory
                            matches={leetifyData?.recentMatches || []}
                            onReview={setSelectedMatchId}
                        />
                    </div>
                </div>

                {/* 4. Steam Stats & Summary Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-green-500 rounded-full" /> Resumo Steam Global
                        </h3>
                        {isOwner && (
                            <span className="bg-green-500/10 text-green-400 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/20 uppercase tracking-widest">
                                Seu Perfil
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Total Kills</p>
                            <p className="text-3xl font-black italic text-white">{steamStats?.total_kills || 0}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Vitórias</p>
                            <p className="text-3xl font-black italic text-green-500">{steamStats?.total_wins || profile.wins || 0}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">HS %</p>
                            <p className="text-3xl font-black italic text-green-500">{steamStats?.hs_percentage || 0}%</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Time Played</p>
                            <p className="text-3xl font-black italic text-yellow-500">{Math.round((steamStats?.total_time_played || 0) / 3600)}h</p>
                        </div>
                    </div>
                </motion.div>

                {/* 5. Inventory Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-3 px-2">
                        <Package className="text-green-500" size={24} />
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">Inventário do Jogador</h3>
                    </div>
                    <InventoryDashboard items={data?.inventory || []} />
                </motion.div>
            </main>

            <footer className="p-20 text-center border-t border-white/5 bg-zinc-900/10">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">CSBRASIL 2026 • Powered by Leetify & Steam</p>
            </footer>
            <MatchReviewModal
                matchId={selectedMatchId}
                onClose={() => setSelectedMatchId(null)}
            />
        </div>
    );
}
