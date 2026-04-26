"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Package, ShieldCheck, Trophy, Target, Zap } from 'lucide-react';
import { getAllBadges, RARITY_COLORS, RARITY_LABELS } from '@/lib/badges';

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
            // Usar o endpoint de sync por player, permitindo que terceiros disparem a atualização
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
                    {/* Skeleton Sidebar */}
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
                        {/* Skeleton Sync Action */}
                        <div className="h-24 bg-zinc-900/40 rounded-[2rem] border border-white/5 w-full flex items-center justify-between p-6">
                            <div className="space-y-2">
                                <div className="w-48 h-6 bg-zinc-800 rounded" />
                                <div className="w-64 h-3 bg-zinc-800 rounded" />
                            </div>
                            <div className="w-40 h-10 bg-zinc-800 rounded-xl" />
                        </div>

                        {/* Skeleton Badges */}
                        <div className="h-32 bg-zinc-900/40 rounded-[2rem] border border-white/5 w-full p-6 space-y-4">
                            <div className="w-32 h-5 bg-zinc-800 rounded" />
                            <div className="flex gap-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="w-24 h-10 bg-zinc-800 rounded-xl" />
                                ))}
                            </div>
                        </div>

                        {/* Skeleton Charts Grid */}
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

    const { profile, steamStats, dbUser, playerStats, leetifyData, inventory, steamLevel, trustRating, trustBreakdown, anomalies, inventoryValue, matches } = data;
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
                            playerStats={playerStats}
                        />
                    </motion.div>

                    {/* MAIN DASHBOARD */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Sync Actions (Show for owner OR if player has sync codes linked) */}
                        {(isOwner || (dbUser?.steamMatchAuthCode && dbUser?.steamLatestMatchCode)) && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col sm:flex-row items-center justify-between bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] rounded-full pointer-events-none" />
                                <div className="z-10 text-center sm:text-left mb-6 sm:mb-0">
                                    <h3 className="font-black italic uppercase text-lg tracking-tighter flex items-center gap-2 justify-center sm:justify-start">
                                        <Zap className="text-yellow-500" size={18} /> 
                                        {isOwner ? 'Central de Sincronização' : 'Atualizar Dados do Jogador'}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                        {isOwner ? 'Atualize seus dados do CS2, Leetify e Faceit.' : 'Sincronize as partidas recentes deste jogador com o servidor.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
                                    {isOwner && (
                                        <button 
                                            onClick={() => window.location.href = '/settings'}
                                            className="flex-1 sm:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all outline-none rounded-xl text-[10px] font-black uppercase text-zinc-300 tracking-widest border border-white/5 text-center"
                                        >
                                            Configurações
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSync}
                                        disabled={syncing}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black outline-none rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 text-center shadow-lg shadow-yellow-500/20"
                                    >
                                        {syncing ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                Sincronizando...
                                            </>
                                        ) : (
                                            <>{isOwner ? 'Sincronizar Agora' : 'Atualizar Perfil'}</>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Badges / Conquistas */}
                        {(() => {
                            // Calcular idade da conta
                            const accountAgeYears = profile.timecreated
                                ? (Date.now() / 1000 - profile.timecreated) / (365 * 24 * 3600)
                                : 0;

                            // % de kills com AWP (vem do metadata das partidas ou steamStats)
                            const awpKillPercentage = steamStats?.awp_kills && steamStats?.total_kills
                                ? Math.round((steamStats.awp_kills / steamStats.total_kills) * 100)
                                : 0;

                            const allBadges = getAllBadges({
                                rating:             playerStats?.premierRating || 0,
                                premierRating:      playerStats?.premierRating || 0,
                                kdr:                playerStats?.kdr || 0,
                                adr:                playerStats?.adr || dbUser?.adr || 0,
                                hsPercentage:       playerStats?.hsPercentage || dbUser?.hsPercentage || 0,
                                awpKillPercentage,
                                matchesPlayed:      playerStats?.matchesPlayed || dbUser?.matchesPlayed || 0,
                                winRate:            dbUser?.winRate ? `${Math.round(dbUser.winRate)}%` : 'N/A',
                                gcLevel:            playerStats?.gcLevel || 0,
                                faceitLevel:        playerStats?.faceitLevel || 0,
                                faceitElo:          playerStats?.faceitElo || 0,
                                accountAgeYears,
                                isPro:              (profile as any)?.isPro || false,
                                rank:               playerStats?.rank,
                            });

                            const unlocked = allBadges.filter(b => !b.locked);
                            const locked   = allBadges.filter(b => b.locked);

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-zinc-900/40 rounded-[2rem] border border-white/5 p-6 backdrop-blur-xl"
                                >
                                    <h3 className="text-sm font-black italic uppercase tracking-tighter mb-5 flex items-center gap-2">
                                        <span className="w-1.5 h-5 bg-yellow-500 rounded-full" />
                                        Conquistas
                                        <span className="ml-auto text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                                            {unlocked.length}/{allBadges.length} desbloqueada{unlocked.length !== 1 ? 's' : ''}
                                        </span>
                                    </h3>

                                    {/* Desbloqueadas */}
                                    {unlocked.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-5">
                                            {unlocked.map(badge => (
                                                <div
                                                    key={badge.id}
                                                    className="group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-black cursor-default transition-all hover:scale-105"
                                                    style={{
                                                        background: `${badge.color}18`,
                                                        borderColor: `${badge.color}50`,
                                                        color: badge.color,
                                                        boxShadow: `0 0 10px ${badge.color}20`,
                                                    }}
                                                    title={badge.description}
                                                >
                                                    <span>{badge.icon}</span>
                                                    <span className="text-[10px] uppercase tracking-widest">{badge.name}</span>
                                                    <div
                                                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                                                        style={{ color: RARITY_COLORS[badge.rarity] }}
                                                    >
                                                        {RARITY_LABELS[badge.rarity]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Separador "Disponíveis" */}
                                    {locked.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex-1 h-px bg-white/5" />
                                                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Disponíveis para desbloquear</span>
                                                <div className="flex-1 h-px bg-white/5" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {locked.map(badge => (
                                                    <div
                                                        key={badge.id}
                                                        className="group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-black cursor-default transition-all opacity-30 grayscale hover:opacity-50 hover:grayscale-0"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.03)',
                                                            borderColor: 'rgba(255,255,255,0.07)',
                                                            color: '#71717a',
                                                        }}
                                                        title={`🔒 ${badge.lockedHint || badge.description}`}
                                                    >
                                                        <span className="grayscale opacity-60">{badge.icon}</span>
                                                        <span className="text-[10px] uppercase tracking-widest">{badge.name}</span>
                                                        {/* Tooltip com dica de como desbloquear */}
                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/10 rounded-lg px-3 py-1.5 text-[8px] font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 max-w-[200px] text-center text-zinc-400">
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
