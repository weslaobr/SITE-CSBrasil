"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Download, Calendar, Activity, Target, Zap, Clock, Shield, X, 
    AlertCircle, Crosshair, TrendingUp, Star, Flame, Eye, MapPin, Trophy, Swords, Info, 
    Check, BarChart2, MousePointer2, PieChart
} from 'lucide-react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// ── TYPES ────────────────────────────────────────────────────────────────────

interface PlayerStats {
    nickname: string;
    avatar: string;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    hs: number;
    kast: number;
    rating: number;
    fk: number;
    fd: number;
    triples: number;
    quads: number;
    aces: number;
    clutches: number;
    trades: number;
    utility_damage: number;
    flash_assists: number;
    enemies_flashed: number;
    blind_time: number;
    he_thrown: number;
    flash_thrown: number;
    smokes_thrown: number;
    molotovs_thrown: number;
    avg_ttd: number;
    avg_kill_distance: number;
    total_damage: number;
    is_user: boolean;
    steam64_id: string;
    team: string;
}

interface Match {
    id: string;
    source: string;
    gameMode: string;
    mapName: string;
    matchDate: string;
    result: string;
    score: string;
    url?: string;
    metadata?: any;
}

interface Props {
    matchId: string | null;
    isOpen: boolean;
    onClose: () => void;
    userSteamId?: string;
    userNickname?: string;
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

const TropaPremiumMatchReportModal: React.FC<Props> = ({
    matchId, isOpen, onClose, userSteamId, userNickname
}) => {
    const { data: session } = useSession();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'placar' | 'utilitarios' | 'combate' | 'economia'>('placar');

    React.useEffect(() => {
        if (isOpen && matchId) {
            fetchMatchData();
        } else if (!isOpen) {
            setMatch(null);
            setTab('placar');
        }
    }, [isOpen, matchId]);

    const fetchMatchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}${userSteamId ? `?profileSteamId=${userSteamId}` : ''}`);
            setMatch(res.data);
        } catch (e) { 
            console.error(e); 
            toast.error("Erro ao carregar dados da partida");
        }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    // --- HELPERS ---
    const getMapImage = (name: string) => {
        const CDN = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images';
        const raw = (name || 'de_mirage').toLowerCase().trim();
        return `${CDN}/${raw.startsWith('de_') ? raw : 'de_' + raw}.png`;
    };

    const isWin = match?.result?.toLowerCase() === 'win' || match?.result?.toLowerCase() === 'vitoria' || match?.result?.toLowerCase() === 'vitória';
    const isLoss = match?.result?.toLowerCase() === 'loss' || match?.result?.toLowerCase() === 'derrota';
    const isTie = !isWin && !isLoss;

    const stats = match?.stats || [];
    
    // Filtro robusto para times (aceita string ou número)
    const t1 = stats.filter((p: any) => 
        String(p.team) === '3' || 
        String(p.initial_team_number) === '3' || 
        p.team === 'CT'
    );
    const t2 = stats.filter((p: any) => 
        String(p.team) === '2' || 
        String(p.initial_team_number) === '2' || 
        p.team === 'T'
    );

    // Se o usuário estiver no time 2, invertemos para que ele sempre veja o seu time em cima/esquerda
    const userInT2 = t2.some((p: any) => p.is_user);
    const myTeam = userInT2 ? t2 : t1;
    const enemyTeam = userInT2 ? t1 : t2;

    const myScore = userInT2 ? match?.team_2_score : match?.team_3_score;
    const enemyScore = userInT2 ? match?.team_3_score : match?.team_2_score;

    const modeLabel = match?.game_mode || match?.gameMode || 'MIX';

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* --- HEADER --- */}
                <div className="relative h-64 shrink-0 overflow-hidden">
                    <img 
                        src={getMapImage(match?.map_name)} 
                        className="absolute inset-0 w-full h-full object-cover brightness-[0.2] scale-105"
                        alt="Map"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
                    
                    <div className="absolute top-8 left-10 right-10 flex justify-between items-start">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                        isWin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                    }`}>
                                        {isWin ? 'Vitória' : isLoss ? 'Derrota' : 'Empate'}
                                    </span>
                                    <span className="px-4 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Trophy size={10} /> {modeLabel}
                                    </span>
                                </div>
                                <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
                                    {match?.map_name?.replace('de_', '') || 'PARTIDA'}
                                </h2>
                                <div className="flex items-center gap-4 mt-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                                <div className="flex items-center gap-4 mt-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                                    <span className="flex items-center gap-2">
                                        <Calendar size={14} /> 
                                        {match?.match_date ? new Date(match.match_date).toLocaleDateString() : '--/--/----'}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                    <span className="flex items-center gap-2"><Clock size={14} /> {match?.duration || '42:00'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-8 mb-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">MEU TIME</span>
                                    <span className={`text-6xl font-black italic ${isWin ? 'text-emerald-500' : 'text-white'}`}>
                                        {myScore ?? 0}
                                    </span>
                                </div>
                                <div className="text-4xl font-black text-zinc-800 mt-6">VS</div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">INIMIGOS</span>
                                    <span className={`text-6xl font-black italic ${isLoss ? 'text-red-500' : 'text-zinc-500'}`}>
                                        {enemyScore ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all group border border-white/10"
                    >
                        <X className="text-zinc-500 group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* --- TABS --- */}
                <div className="flex items-center justify-center gap-1 p-2 bg-zinc-900/50 border-y border-white/5 shrink-0">
                    {[
                        { id: 'placar', label: 'Dashboard', icon: <Activity size={16} /> },
                        { id: 'combate', label: 'Combate Elite', icon: <Crosshair size={16} /> },
                        { id: 'utilitarios', label: 'Utilidade & Flash', icon: <Flame size={16} /> },
                        { id: 'economia', label: 'Economia', icon: <TrendingUp size={16} /> },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                tab === t.id 
                                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20">
                            <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-6" />
                            <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Processando dados ricos...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-12"
                            >
                                {tab === 'placar' && (
                                    <div className="space-y-10">
                                        <TeamTable title="MEU TIME" players={myTeam} isEnemy={false} />
                                        <TeamTable title="ADVERSÁRIOS" players={enemyTeam} isEnemy={true} />
                                    </div>
                                )}

                                {tab === 'combate' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-yellow-500 mb-6 flex items-center gap-3">
                                                <Zap size={18} /> Impacto e Abertura
                                            </h3>
                                            <div className="space-y-4">
                                                {myTeam.sort((a: any, b: any) => (b.fk || 0) - (a.fk || 0)).slice(0, 5).map((p: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="flex items-center gap-4">
                                                            <img src={p.avatar} className="w-10 h-10 rounded-xl" alt="" />
                                                            <div>
                                                                <div className="text-xs font-black uppercase text-white">{p.name}</div>
                                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{p.rating?.toFixed(2)} Rating</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[9px] font-bold text-zinc-600 mb-1">ENTRY</span>
                                                                <span className="text-sm font-black text-emerald-400">{p.fk || 0}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[9px] font-bold text-zinc-600 mb-1">CLUTCH</span>
                                                                <span className="text-sm font-black text-yellow-500">{p.clutches || 0}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[9px] font-bold text-zinc-600 mb-1">TRADES</span>
                                                                <span className="text-sm font-black text-blue-400">{p.trades || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-purple-500 mb-6 flex items-center gap-3">
                                                <Target size={18} /> Precisão de Elite
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {myTeam.slice(0, 4).map((p: any, i: number) => (
                                                    <div key={i} className="p-5 bg-white/5 rounded-[24px] border border-white/5 flex flex-col items-center text-center">
                                                        <img src={p.avatar} className="w-12 h-12 rounded-2xl mb-3" alt="" />
                                                        <div className="text-[10px] font-black uppercase text-white mb-3 truncate w-full">{p.name}</div>
                                                        <div className="grid grid-cols-2 w-full gap-2">
                                                            <div className="bg-black/40 p-2 rounded-xl">
                                                                <div className="text-[8px] font-bold text-zinc-600 uppercase">HS%</div>
                                                                <div className="text-xs font-black text-rose-500">{(p.accuracy_head * 100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="bg-black/40 p-2 rounded-xl">
                                                                <div className="text-[8px] font-bold text-zinc-600 uppercase">SPRAY</div>
                                                                <div className="text-xs font-black text-emerald-500">{p.metadata?.spray_accuracy?.toFixed(0) || '0'}%</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab === 'utilitarios' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard title="Dano de HE" value={myTeam.reduce((acc: number, p: any) => acc + (p.he_damage || 0), 0)} icon={<Zap className="text-orange-500" />} />
                                        <StatCard title="Inimigos Cegos" value={myTeam.reduce((acc: number, p: any) => acc + (p.enemies_flashed || p.flashbang_hit_foe || 0), 0)} icon={<Eye className="text-yellow-400" />} />
                                        <StatCard title="Tempo de Cegueira" value={`${myTeam.reduce((acc: number, p: any) => acc + (p.total_blind_duration || p.blind_time || 0), 0).toFixed(1)}s`} icon={<Clock className="text-blue-400" />} />
                                        <StatCard title="Flash Assists" value={myTeam.reduce((acc: number, p: any) => acc + (p.flash_assists || 0), 0)} icon={<Star className="text-purple-400" />} />
                                        
                                        <div className="col-span-full mt-10">
                                            <TeamTable title="EFICIÊNCIA TÁTICA" players={myTeam} isEnemy={false} variant="utility" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                {/* --- FOOTER --- */}
                <div className="p-6 bg-black border-t border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Diferencial TropaCS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(246,203,2,0.5)]" />
                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Análise de Demo Local</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 group">
                            <Download size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Download Demo</span>
                        </button>
                        <button className="flex items-center gap-3 px-6 py-3 bg-yellow-500 text-black rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 active:scale-95">
                            <BarChart2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Exportar Relatório</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const TeamTable = ({ title, players, isEnemy, variant = 'full' }: { title: string, players: any[], isEnemy: boolean, variant?: 'full' | 'utility' }) => (
    <div className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isEnemy ? 'text-zinc-600' : 'text-emerald-500'}`}>
            <span className={`w-1 h-4 rounded-full ${isEnemy ? 'bg-zinc-800' : 'bg-emerald-500'}`} /> {title}
        </h3>
        <div className="overflow-hidden rounded-[32px] border border-white/5 bg-zinc-900/20">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[9px] font-black uppercase text-zinc-600 tracking-widest bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4">Jogador</th>
                        {variant === 'full' ? (
                            <>
                                <th className="px-4 py-4 text-center">RT 2.0</th>
                                <th className="px-4 py-4 text-center">K / D / A</th>
                                <th className="px-4 py-4 text-center">ADR</th>
                                <th className="px-4 py-4 text-center">HS%</th>
                                <th className="px-4 py-4 text-center">KAST</th>
                                <th className="px-4 py-4 text-center">Dano</th>
                            </>
                        ) : (
                            <>
                                <th className="px-4 py-4 text-center">Dano HE</th>
                                <th className="px-4 py-4 text-center">Cegou</th>
                                <th className="px-4 py-4 text-center">Blind Duration</th>
                                <th className="px-4 py-4 text-center">HEs</th>
                                <th className="px-4 py-4 text-center">Fls</th>
                                <th className="px-4 py-4 text-center">Smks</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                    {players.sort((a, b) => (b.rating || 0) - (a.rating || 0)).map((p, i) => (
                        <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${p.is_user ? 'bg-yellow-500/5' : ''}`}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img src={p.avatar} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                                        {p.is_user && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-zinc-950" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white">{p.name}</div>
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{p.metadata?.role || 'RIFLER'}</div>
                                    </div>
                                </div>
                            </td>
                            {variant === 'full' ? (
                                <>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-sm font-black italic ${p.rating >= 1.2 ? 'text-emerald-400' : p.rating < 0.8 ? 'text-rose-500' : 'text-white'}`}>
                                            {p.rating?.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center font-bold text-xs text-zinc-400">
                                        <span className="text-white">{p.kills}</span> / {p.deaths} / {p.assists}
                                    </td>
                                    <td className="px-4 py-4 text-center font-black text-zinc-300 text-xs">{p.adr?.toFixed(1)}</td>
                                    <td className="px-4 py-4 text-center font-bold text-zinc-500 text-xs">{(p.accuracy_head * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-4 text-center font-bold text-zinc-500 text-xs">{p.kast?.toFixed(0)}%</td>
                                    <td className="px-4 py-4 text-center font-black text-yellow-500/80 text-xs">{p.total_damage}</td>
                                </>
                            ) : (
                                <>
                                    <td className="px-4 py-4 text-center text-orange-400 font-black">{p.he_damage || p.utility_damage || 0}</td>
                                    <td className="px-4 py-4 text-center text-yellow-500 font-black">{p.enemies_flashed || p.flashbang_hit_foe || 0}</td>
                                    <td className="px-4 py-4 text-center text-blue-400 font-bold">{(p.total_blind_duration || p.blind_time || 0).toFixed(1)}s</td>
                                    <td className="px-4 py-4 text-center text-zinc-500 text-xs">{p.he_thrown || 0}</td>
                                    <td className="px-4 py-4 text-center text-zinc-500 text-xs">{p.flash_thrown || 0}</td>
                                    <td className="px-4 py-4 text-center text-zinc-500 text-xs">{p.smokes_thrown || 0}</td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const StatCard = ({ title, value, icon }: { title: string, value: any, icon: any }) => (
    <div className="p-6 bg-zinc-900/40 rounded-[28px] border border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{title}</span>
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                {icon}
            </div>
        </div>
        <div className="text-3xl font-black italic tracking-tighter text-white">
            {value}
        </div>
    </div>
);

export default TropaPremiumMatchReportModal;
