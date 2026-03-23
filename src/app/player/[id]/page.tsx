"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Package, ShieldCheck, Trophy, Target, Zap } from 'lucide-react';

// New Components
import ProfileSidebar from "@/components/profile/profile-sidebar";
import TrustRating from "@/components/profile/trust-rating";
import StatsAnalysis from "@/components/profile/stats-analysis";
import AnomaliesDetected from "@/components/profile/anomalies-detected";
import AccountReputation from "@/components/profile/account-reputation";
import TrustCriteria from "@/components/profile/trust-criteria";

// Existing Components
import AttributesRadarChart from "@/components/tropacs/radar-chart";
import MatchHistory from "@/components/tropacs/match-history";
import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import MatchReportModal from '@/components/dashboard/match-report-modal';

export default function PlayerProfilePage() {
    const params = useParams();
    const steamId = params.id as string;
    const { data: session } = useSession();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
    const [exchangeRate, setExchangeRate] = useState<any>(null);

    const fetchData = async () => {
        if (!steamId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/player/${steamId}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch('/api/exchange-rate')
            .then(res => res.json())
            .then(json => setExchangeRate(json))
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchData();
    }, [steamId]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/sync/all', { method: 'POST' });
            if (res.ok) {
                await fetchData();
            }
        } catch (err) {
            console.error("Sync error:", err);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                    <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando Perfil...</p>
                </div>
            </div>
        );
    }

    if (!data || data.error) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                    <h2 className="text-3xl font-black italic uppercase text-red-500">Perfil não encontrado</h2>
                    <p className="text-zinc-500">Não conseguimos localizar os dados desse jogador na Steam ou no Leetify.</p>
                    <button onClick={() => window.location.href = '/'} className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs">Voltar à Busca</button>
                </div>
            </div>
        );
    }

    const { profile, steamStats, dbUser, leetifyData, inventory, steamLevel, trustRating, trustBreakdown, anomalies, inventoryValue, matches } = data;
    const isOwner = (session?.user as any)?.steamId === steamId;

    // Filter Medals for the sidebar
    const medals = inventory.filter((item: any) =>
        item.category_internal === 'Collectible' ||
        item.type === 'Collectible' ||
        item.name_en?.includes('Medal') ||
        item.name_en?.includes('Coin') ||
        item.name_en?.includes('Badge')
    );

    // Prepare Account Reputation Data
    const accountAgeYears = profile.timecreated
        ? Math.floor((Date.now() / 1000 - profile.timecreated) / (365 * 24 * 3600))
        : 0;
    const accountAgeMonths = profile.timecreated
        ? Math.floor(((Date.now() / 1000 - profile.timecreated) % (365 * 24 * 3600)) / (30 * 24 * 3600))
        : 0;

    const formatCurrency = (valUSD: number) => {
        if (currency === 'BRL') {
            const rate = exchangeRate ? exchangeRate.rate : 6.15;
            return `R$ ${Math.round(valUSD * rate).toLocaleString('pt-BR')}`;
        }
        return `$${Math.round(valUSD).toLocaleString('en-US')}`;
    };

    const repData = {
        accountAge: `${accountAgeYears}a ${accountAgeMonths}m`,
        hoursPlayed: `${Math.floor(steamStats?.total_time_played / 3600 || 0).toLocaleString()}h`,
        inventoryValue: formatCurrency(inventoryValue || 0),
        steamLevel: steamLevel || 0,
        collectibles: medals.length
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-emerald-500 selection:text-black font-sans">
            <main className="p-4 md:p-8 lg:p-12 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* LEFT SIDEBAR */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3 h-full"
                    >
                        <ProfileSidebar
                            profile={profile}
                            steamStats={steamStats}
                            inventoryValueStr={formatCurrency(inventoryValue || 0)}
                            steamLevel={steamLevel}
                            medals={medals}
                            leetifyData={leetifyData}
                        />
                    </motion.div>

                    {/* MAIN DASHBOARD */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Account Reputation Summary Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <AccountReputation data={repData} />
                        </motion.div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Trust Rating Section */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-12 backdrop-blur-xl flex items-center justify-center flex-col h-full"
                            >
                                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 lg:mb-5 self-start flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Reputação do jogador
                                </h3>
                                <div className="flex-1 flex flex-col items-center justify-center w-full gap-5">
                                    <TrustRating rating={trustRating} status={trustRating >= 90 ? "Normal" : trustRating >= 70 ? "Estável" : "Arriscado"} />
                                    <TrustCriteria breakdown={trustBreakdown} />
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                                        Análise baseada em padrões de gameplay e performance.
                                    </p>
                                </div>
                            </motion.div>

                            {/* Radar Chart (Perfil de Performance) */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-zinc-950/30 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl flex flex-col h-full"
                            >
                                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-yellow-500 rounded-full" /> Perfil de Performance
                                </h3>
                                <div className="flex-1 flex items-center justify-center">
                                    {leetifyData?.ratings ? (
                                        <div className="w-full flex items-center justify-center transform scale-90 lg:scale-100">
                                            <AttributesRadarChart data={leetifyData.ratings} />
                                        </div>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-zinc-600 font-bold uppercase text-[10px] tracking-widest text-center">
                                            Aguardando processamento de IA do Leetify...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Anomalies Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <AnomaliesDetected anomalies={anomalies} />
                        </motion.div>

                        {/* Stats Analysis Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <StatsAnalysis stats={leetifyData?.ratings} />
                        </motion.div>

                        <p className="text-[9px] text-zinc-600 font-bold uppercase italic flex items-start gap-2 max-w-4xl opacity-60">
                            <span className="text-amber-500 font-black italic">⚠️ Aviso Legal:</span>
                            Esta análise fornece estimativas estatísticas baseadas em padrões de jogabilidade e deve ser usada apenas como uma ferramenta complementar. Os resultados podem variar e não devem ser considerados provas definitivas de qualquer comportamento. Sempre considere vários fatores e o contexto ao avaliar a reputação do jogador.
                        </p>
                    </div>
                </div>

                {/* Match History Section */}
                <div className="pt-12 border-t border-white/5">
                    <MatchHistory
                        matches={matches && matches.length > 0 ? matches : (leetifyData?.recentMatches || [])}
                        onReview={setSelectedMatchId}
                        onSync={handleSync}
                        loading={syncing}
                    />
                </div>

                {/* Inventory View */}
                <div className="space-y-6 pt-12 border-t border-white/5">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <Package className="text-emerald-500" size={24} />
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Inventário do Jogador</h3>
                        </div>
                    </div>
                    <InventoryDashboard
                        items={inventory}
                        currency={currency}
                        setCurrency={setCurrency}
                        exchangeRate={exchangeRate}
                    />
                </div>
            </main>

            <footer className="p-20 text-center border-t border-white/5 bg-zinc-900/10">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">TropaCS 2026 • Powered by Leetify & Steam</p>
            </footer>

            <MatchReportModal
                match={null}
                matchId={selectedMatchId}
                isOpen={!!selectedMatchId}
                onClose={() => setSelectedMatchId(null)}
            />
        </div>
    );
}
