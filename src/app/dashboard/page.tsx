"use client";

import PlayerCard from "@/components/dashboard/player-card";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Swords,
    History,
    TrendingUp,
    Target,
    Zap,
    RefreshCw,
    Users,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { data: session } = useSession();
    const [playerData, setPlayerData] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [lobbies, setLobbies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [inventoryCount, setInventoryCount] = useState(0);

    const fetchData = async () => {
        if (!session) return;
        setSyncing(true);
        try {
            const [playerRes, matchesRes, lobbiesRes, inventoryRes] = await Promise.all([
                fetch('/api/player'),
                fetch('/api/matches'),
                fetch('/api/lobby'),
                fetch('/api/inventory')
            ]);

            const [player, matchesData, lobbiesData, inventoryData] = await Promise.all([
                playerRes.json(),
                matchesRes.json(),
                lobbiesRes.json(),
                inventoryRes.json()
            ]);

            if (player.profile) setPlayerData(player);
            if (matchesData.matches) setMatches(matchesData.matches.slice(0, 5));
            if (lobbiesData) setLobbies(lobbiesData.slice(0, 3));
            if (inventoryData.items) setInventoryCount(inventoryData.items.length);
        } catch (e) {
            console.error("Error fetching dashboard data:", e);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [session]);

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-8 text-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <div className="w-24 h-24 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                        <Swords size={40} className="text-cyan-500" />
                    </div>
                    <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter italic">Bem-vindo à Tropa do CS2</h2>
                    <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
                        Conecte-se com sua conta Steam para desbloquear estatísticas em tempo real,
                        histórico de partidas e o nosso sistema de mix 5x5 pro.
                    </p>
                    <Link href="/api/auth/signin" className="inline-block bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-all">
                        Entrar com Steam
                    </Link>
                </motion.div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="p-8 space-y-12 max-w-7xl mx-auto">
            {/* Header / Top Stats */}
            <section className="flex flex-col lg:flex-row gap-8 items-start">
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="w-full lg:w-auto"
                >
                    {playerData ? (
                        <PlayerCard
                            player={{
                                steamId: (session.user as any)?.steamId,
                                nickname: playerData.profile.personaname,
                                avatar: playerData.profile.avatarfull,
                                rank: (playerData.stats?.total_wins || 0) > 10 ? "Global Elite" : "Unranked",
                                rating: 2500,
                                adr: playerData.stats?.adr || 0,
                                hsPercentage: playerData.stats?.hs_percentage || 0,
                                kd: playerData.stats?.kd || 0,
                                winRate: playerData.stats?.total_wins ? `${Math.round((playerData.stats.total_wins / ((playerData.stats.total_kills || 1) / 20)) * 100)}%` : "0%",
                                hours: Math.round((playerData.stats?.total_time_played || 0) / 3600)
                            }}
                        />
                    ) : (
                        <div className="w-80 h-[450px] bg-zinc-900/40 animate-pulse rounded-[40px] border border-white/5" />
                    )}
                </motion.div>

                <div className="flex-1 space-y-8 w-full">
                    <div className="flex justify-between items-center">
                        <motion.h1
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-3xl font-black italic uppercase tracking-tighter"
                        >
                            Overview <span className="text-cyan-500">Dashboard</span>
                        </motion.h1>
                        <button
                            onClick={fetchData}
                            disabled={syncing}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        <StatCard icon={<Target className="text-cyan-400" />} label="Kills" value={playerData?.stats?.total_kills || 0} color="cyan" />
                        <StatCard icon={<TrendingUp className="text-green-400" />} label="Vitórias" value={playerData?.stats?.total_wins || 0} color="green" />
                        <StatCard icon={<Zap className="text-yellow-400" />} label="MVPs" value={playerData?.stats?.total_mvps || 0} color="yellow" />
                        <StatCard icon={<History className="text-purple-400" />} label="Matches" value={matches.length} color="purple" />
                    </motion.div>

                    {/* Active Lobbies Quick Access */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Users size={16} /> Lobbies Ativos
                            </h2>
                            <Link href="/lobby" className="text-[10px] font-bold uppercase text-cyan-500 hover:text-cyan-400 transition-colors">Ver todos</Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {lobbies.length > 0 ? lobbies.map((lobby) => (
                                <Link key={lobby.id} href={`/lobby/${lobby.id}`}>
                                    <div className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-all group">
                                        <p className="font-bold text-sm truncate mb-1">{lobby.name}</p>
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-bold">
                                            <span>{lobby._count.players}/10 Players</span>
                                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div className="col-span-3 py-4 text-center text-zinc-700 font-bold uppercase text-[10px]">Nenhum lobby disponível no momento</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Recent Matches Table-ish Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-8 space-y-6"
                >
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                            <History className="text-cyan-500" /> Partidas Recentes
                        </h2>
                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded font-bold text-zinc-500 uppercase">Last 5 Matches</span>
                    </div>

                    <div className="space-y-3">
                        {matches.length > 0 ? matches.map((match, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={match.id}
                                className="bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/5 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all group"
                            >
                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-xl ${match.result === 'Win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {match.result === 'Win' ? 'W' : 'L'}
                                    </div>
                                    <div>
                                        <p className="font-black uppercase italic tracking-tighter text-lg">{match.mapName}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">{match.gameMode || 'Competitive'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-12 flex-1 justify-center">
                                    <div className="text-center">
                                        <p className="text-zinc-500 text-[9px] font-black uppercase mb-1">Score</p>
                                        <p className="font-black italic text-lg tracking-tighter">{match.score}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-zinc-500 text-[9px] font-black uppercase mb-1">K/D/A</p>
                                        <p className="font-bold text-sm tracking-widest">{match.kills}/{match.deaths}/{match.assists}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-zinc-500 text-[9px] font-black uppercase mb-1">ADR</p>
                                        <p className="font-bold text-sm text-cyan-500 italic">{match.adr?.toFixed(1) || 0}</p>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto text-right">
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase">{new Date(match.matchDate).toLocaleDateString()}</p>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                                <p className="text-zinc-600 font-black uppercase text-xs">Aguardando sincronização de partidas...</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Sidebar Achievements/News */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-4 space-y-8"
                >
                    <div className="bg-gradient-to-br from-cyan-600 to-blue-800 p-8 rounded-[40px] text-white relative overflow-hidden group shadow-2xl shadow-cyan-500/20">
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Pronto para o Próximo Mix?</h3>
                            <p className="text-white/70 text-sm font-medium">Melhore suas estatísticas jogando com a Tropa. Ranking atualizado a cada partida.</p>
                            <Link href="/lobby" className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase text-xs inline-block transition-transform group-hover:scale-105">Criar Sala 5x5</Link>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <Swords size={160} />
                        </div>
                    </div>

                    <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[40px] backdrop-blur-xl">
                        <h3 className="text-lg font-black italic uppercase tracking-tighter mb-6">News & Updates</h3>
                        <div className="space-y-6">
                            <NewsItem title="Novo Radar de Utilidades" date="Hoje" />
                            <NewsItem title="Subida de Patente Liberada" date="Ontem" />
                            <NewsItem title="Ajustes no Balanceamento" date="2 dias" />
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}

function StatCard({ icon, label, value, color }: any) {
    const colors: any = {
        cyan: "group-hover:border-cyan-500/50",
        green: "group-hover:border-green-500/50",
        yellow: "group-hover:border-yellow-500/50",
        purple: "group-hover:border-purple-500/50",
    };

    const textColors: any = {
        cyan: "group-hover:text-cyan-400",
        green: "group-hover:text-green-500",
        yellow: "group-hover:text-yellow-500",
        purple: "group-hover:text-purple-400",
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`bg-white/5 p-6 rounded-[32px] border border-white/5 transition-all group ${colors[color]}`}
        >
            <div className="mb-4 bg-zinc-900/40 w-10 h-10 rounded-xl flex items-center justify-center border border-white/5">
                {icon}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black transition-colors tracking-tighter italic ${textColors[color]}`}>{value}</p>
        </motion.div>
    );
}

function NewsItem({ title, date }: any) {
    return (
        <div className="group cursor-pointer">
            <p className="text-[9px] text-zinc-600 font-black uppercase mb-1">{date}</p>
            <p className="text-sm font-bold group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{title}</p>
        </div>
    );
}
