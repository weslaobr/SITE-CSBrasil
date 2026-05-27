"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Package, ShieldCheck, Trophy, Target, Zap, RefreshCw, Crosshair, Swords, Map } from 'lucide-react';
import { getAllBadges, RARITY_COLORS, RARITY_LABELS } from '@/lib/badges';

import ProfileSidebar from "@/components/profile/profile-sidebar";
import TrustRating from "@/components/profile/trust-rating";
import StatsAnalysis from "@/components/profile/stats-analysis";
import AnomaliesDetected from "@/components/profile/anomalies-detected";
import AccountReputation from "@/components/profile/account-reputation";
import TrustCriteria from "@/components/profile/trust-criteria";
import AttributesRadarChart from "@/components/tropacs/radar-chart";
import MatchHistory from "@/components/tropacs/match-history";
import InventoryDashboard from "@/components/dashboard/inventory-dashboard";

export default function PlayerProfilePage() {
    const params = useParams();
    const steamId = params.id as string;
    const { data: session } = useSession();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
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
            const res = await fetch('/api/sync/player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steamId })
            });
            if (res.ok) {
                const data = await res.json();
                await fetchData();
                alert(`Sincronizado com sucesso! ${data.count} novas partidas processadas.`);
            } else {
                const errData = await res.json();
                alert(`Erro: ${errData.error || 'Falha ao sincronizar'}`);
            }
        } catch (err) {
            console.error("Sync error:", err);
            alert("Erro ao sincronizar jogador.");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 lg:p-12 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start opacity-50 animate-pulse">
                    <div className="lg:col-span-3 h-[800px] bg-zinc-900/40 rounded-[2rem] border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-32 bg-yellow-500/10" />
                        <div className="flex flex-col items-center pt-16 px-6">
                            <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-yellow-500/20 z-10" />
                            <div className="w-3/4 h-6 bg-zinc-800 rounded mt-4" />
                            <div className="w-1/2 h-4 bg-zinc-800 rounded mt-2" />
                            <div className="w-full h-px bg-white/5 my-6" />
                            <div className="w-full space-y-4">
                                <div className="h-10 bg-zinc-800 rounded-xl" />
                                <div className="h-10 bg-zinc-800 rounded-xl" />
                                <div className="h-10 bg-zinc-800 rounded-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-9 space-y-8">
                        <div className="h-24 bg-zinc-900/40 rounded-[2rem] border border-white/5 w-full flex items-center justify-between p-6">
                            <div className="space-y-2">
                                <div className="w-48 h-6 bg-zinc-800 rounded" />
                                <div className="w-64 h-3 bg-zinc-800 rounded" />
                            </div>
                            <div className="w-40 h-10 bg-zinc-800 rounded-xl" />
                        </div>
                        <div className="h-32 bg-zinc-900/40 rounded-[2rem] border border-white/5 w-full p-6 space-y-4">
                            <div className="w-32 h-5 bg-zinc-800 rounded" />
                            <div className="flex gap-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="w-24 h-10 bg-zinc-800 rounded-xl" />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-96">
                            <div className="bg-zinc-900/40 rounded-[40px] border border-white/5" />
                            <div className="bg-zinc-900/40 rounded-[40px] border border-white/5" />
                        </div>
                    </div>
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

    const { profile, steamStats, dbUser, playerStats, leetifyData, inventory, steamLevel, trustRating, trustBreakdown, anomalies, inventoryValue, matches, mapStats, weaponStats } = data;
    const isOwner = (session?.user as any)?.steamId === steamId;

    const mixMatches = (matches || []).filter((m: any) =>
        ['mix', 'demo', 'local'].some(s => (m.source || m.gameMode || '').toLowerCase().includes(s))
    );
    const mixWins = mixMatches.filter((m: any) => (m.result || '').toLowerCase() === 'win').length;
    const mixWinRate = mixMatches.length > 0 ? `${Math.round((mixWins / mixMatches.length) * 100)}%` : 'N/A';

    const medals = inventory.filter((item: any) =>
        item.category_internal === 'Collectible' ||
        item.type === 'Collectible' ||
        item.name_en?.includes('Medal') ||
        item.name_en?.includes('Coin') ||
        item.name_en?.includes('Badge')
    );

    const accountAgeYears = profile.timecreated
        ? Math.floor((Date.now() / 1000 - profile.timecreated) / (365 * 24 * 3600)) : 0;
    const accountAgeMonths = profile.timecreated
        ? Math.floor(((Date.now() / 1000 - profile.timecreated) % (365 * 24 * 3600)) / (30 * 24 * 3600)) : 0;

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
            <main className="p-4 md:p-8 lg:p-12 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT SIDEBAR */}
                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
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
                            playerStats={playerStats}
                        />
                    </motion.div>

                    {/* MAIN CONTENT */}
                    <div className="lg:col-span-9 space-y-4">
                        {/* SYNC BAR */}
                        {(isOwner || (dbUser?.steamMatchAuthCode && dbUser?.steamLatestMatchCode)) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative overflow-hidden bg-gradient-to-r from-zinc-900/60 to-zinc-900/30 rounded-[24px] border border-white/5 p-5 backdrop-blur-xl"
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 blur-[80px] rounded-full pointer-events-none" />
                                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                            <RefreshCw size={16} className="text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black italic tracking-tight text-white">
                                                {isOwner ? 'Central de Sincronização' : 'Atualizar Dados'}
                                            </p>
                                            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                                                {isOwner ? 'CS2, Leetify e Faceit' : 'Partidas recentes deste jogador'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {isOwner && (
                                            <button
                                                onClick={() => window.location.href = '/settings'}
                                                className="flex-1 sm:flex-none px-5 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-xl text-[8px] font-black uppercase text-zinc-400 tracking-widest border border-white/5"
                                            >
                                                Config
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSync}
                                            disabled={syncing}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black rounded-xl text-[8px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-yellow-500/15"
                                        >
                                            {syncing ? (
                                                <><div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Sincronizando...</>
                                            ) : (
                                                <><RefreshCw size={12} /> {isOwner ? 'Sincronizar' : 'Atualizar'}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* BADGES / ACHIEVEMENTS */}
                        {(() => {
                            const accountAgeYears = profile.timecreated
                                ? (Date.now() / 1000 - profile.timecreated) / (365 * 24 * 3600) : 0;
                            const awpKillPercentage = steamStats?.awp_kills && steamStats?.total_kills
                                ? Math.round((steamStats.awp_kills / steamStats.total_kills) * 100) : 0;

                            const allBadges = getAllBadges({
                                rating: playerStats?.premierRating || 0,
                                premierRating: playerStats?.premierRating || 0,
                                kdr: playerStats?.kdr || 0,
                                adr: playerStats?.adr || dbUser?.adr || 0,
                                hsPercentage: playerStats?.hsPercentage || dbUser?.hsPercentage || 0,
                                awpKillPercentage,
                                matchesPlayed: playerStats?.matchesPlayed || dbUser?.matchesPlayed || 0,
                                winRate: mixWinRate,
                                gcLevel: playerStats?.gcLevel || 0,
                                faceitLevel: playerStats?.faceitLevel || 0,
                                faceitElo: playerStats?.faceitElo || 0,
                                accountAgeYears,
                                isPro: (profile as any)?.isPro || false,
                                rank: playerStats?.rank,
                            });

                            const unlocked = allBadges.filter(b => !b.locked);
                            const locked = allBadges.filter(b => b.locked);

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 rounded-[24px] border border-white/5 p-5 backdrop-blur-xl"
                                >
                                    <div className="flex items-center gap-3 mb-5">
                                        <Trophy size={16} className="text-yellow-500" />
                                        <h3 className="text-sm font-black italic uppercase tracking-tight text-white">Conquistas</h3>
                                        <div className="flex-1 h-px bg-white/5" />
                                        <span className="text-[8px] font-black text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-md border border-white/5">
                                            {unlocked.length}/{allBadges.length}
                                        </span>
                                    </div>

                                    {unlocked.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                                            {unlocked.map(badge => (
                                                <div
                                                    key={badge.id}
                                                    className="group relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border cursor-default transition-all hover:scale-105 hover:-translate-y-0.5"
                                                    style={{
                                                        background: `${badge.color}10`,
                                                        borderColor: `${badge.color}30`,
                                                    }}
                                                    title={badge.description}
                                                >
                                                    <span className="text-lg">{badge.icon}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight"
                                                        style={{ color: badge.color }}>{badge.name}</span>
                                                    <div
                                                        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[7px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl"
                                                        style={{ color: RARITY_COLORS[badge.rarity] }}
                                                    >
                                                        {RARITY_LABELS[badge.rarity]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {locked.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex-1 h-px bg-white/5" />
                                                <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">Disponíveis</span>
                                                <div className="flex-1 h-px bg-white/5" />
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {locked.map(badge => (
                                                    <div
                                                        key={badge.id}
                                                        className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-default transition-all opacity-40 grayscale hover:opacity-60"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.03)',
                                                            borderColor: 'rgba(255,255,255,0.06)',
                                                        }}
                                                        title={badge.lockedHint || badge.description}
                                                    >
                                                        <span className="grayscale opacity-60 text-xs">{badge.icon}</span>
                                                        <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600">{badge.name}</span>
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[7px] font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 max-w-[160px] text-center text-zinc-500 shadow-xl">
                                                            🔒 {badge.lockedHint || badge.description}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            );
                        })()}

                        {/* ACCOUNT REPUTATION */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <AccountReputation data={repData} />
                        </motion.div>

                        {/* TRUST + RADAR */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-4 backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-3.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black italic uppercase tracking-tight text-white">Reputação</span>
                                </div>
                                <div className="flex items-start gap-4">
                                    <TrustRating rating={trustRating} status={trustRating >= 90 ? "Normal" : trustRating >= 70 ? "Estável" : "Arriscado"} />
                                    <div className="flex-1 min-w-0 pt-1">
                                        <TrustCriteria breakdown={trustBreakdown} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-4 backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-1 h-3.5 rounded-full bg-yellow-500" />
                                    <span className="text-[10px] font-black italic uppercase tracking-tight text-white">Performance</span>
                                </div>
                                {leetifyData?.ratings ? (
                                    <div className="w-full max-h-[160px] flex items-center justify-center">
                                        <AttributesRadarChart data={leetifyData.ratings} compact />
                                    </div>
                                ) : (
                                    <div className="h-[120px] flex items-center justify-center text-zinc-600 font-bold uppercase text-[7px] tracking-widest text-center">
                                        Aguardando Leetify...
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* MAP PERFORMANCE */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 rounded-[24px] border border-white/5 p-4 backdrop-blur-xl"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Map size={12} className="text-violet-400" />
                                <h3 className="text-[10px] font-black italic uppercase tracking-tight text-white">Mapas</h3>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>
                            {Object.keys(mapStats || {}).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {Object.entries(mapStats || {}).sort(([, a]: any, [, b]: any) => b.matches - a.matches).map(([mapName, stats]: [string, any], i) => {
                                        const winRate = parseFloat(stats.winRate) || 0;
                                        const barColor = winRate >= 55 ? '#22c55e' : winRate >= 45 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <motion.div
                                                key={mapName}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-white/[0.04] flex items-center justify-center flex-shrink-0">
                                                    <span className="text-[8px] font-black text-zinc-500 uppercase">{mapName.replace('de_', '').slice(0, 3)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[8px] font-bold text-zinc-400">{stats.matches}j</span>
                                                        <span className="text-[8px] font-bold" style={{ color: barColor }}>
                                                            {stats.winRate}% WR • {stats.avgKDR} KDR • {stats.avgADR} ADR
                                                            {stats.avgKast && ` • ${stats.avgKast}% KAST`}
                                                        </span>
                                                    </div>
                                                    <div className="relative w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden mt-0.5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${winRate}%` }}
                                                            transition={{ duration: 0.8, delay: i * 0.02 }}
                                                            className="absolute inset-y-0 left-0 rounded-full"
                                                            style={{
                                                                background: `linear-gradient(90deg, ${barColor}60, ${barColor})`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-4 border border-dashed border-white/5 rounded-xl">
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Nenhum dado de mapa disponível</p>
                                </div>
                            )}
                        </motion.div>

                        {/* ANOMALIES */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                            <AnomaliesDetected anomalies={anomalies} />
                        </motion.div>

                        {/* STATS ANALYSIS */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <StatsAnalysis stats={leetifyData?.ratings} />
                        </motion.div>

                        {/* DISCLAIMER */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-[7px] text-zinc-700 font-bold uppercase italic flex items-start gap-2 leading-relaxed border border-white/5 rounded-xl px-4 py-3 bg-zinc-900/20"
                        >
                            <span className="text-amber-600 font-black italic flex-shrink-0">⚠</span>
                            Análise baseada em padrões de jogabilidade. Resultados podem variar — não considere como prova definitiva.
                        </motion.p>
                    </div>
                </div>

                {/* MATCH HISTORY */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="pt-8 border-t border-white/5"
                >
                    <MatchHistory
                        matches={matches && matches.length > 0 ? matches : (leetifyData?.recentMatches || [])}
                        loading={syncing}
                        steamId={steamId}
                        steamNickname={profile?.personaname}
                    />
                </motion.div>

                {/* INVENTORY */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="pt-8 border-t border-white/5 space-y-5"
                >
                    <div className="flex items-center gap-3">
                        <Package size={18} className="text-emerald-500" />
                        <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">Inventário</h3>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <InventoryDashboard
                        items={inventory}
                        currency={currency}
                        setCurrency={setCurrency}
                        exchangeRate={exchangeRate}
                    />
                </motion.div>
            </main>

            <footer className="p-12 text-center border-t border-white/5 bg-zinc-900/10 mt-8">
                <p className="text-[8px] text-zinc-700 font-black uppercase tracking-[0.5em]">TropaCS 2026 • Powered by Leetify &amp; Steam</p>
            </footer>
        </div>
    );
}
