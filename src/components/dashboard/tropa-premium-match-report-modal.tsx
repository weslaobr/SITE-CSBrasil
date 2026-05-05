"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Download, Calendar, Activity, Target, Zap, Clock, X, 
    Crosshair, TrendingUp, Star, Eye, Trophy, BarChart2, Flame
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface Props {
    matchId: string | null;
    isOpen: boolean;
    onClose: () => void;
    userSteamId?: string;
    userNickname?: string;
}

// Normaliza os campos vindos da API (que usa total_kills, dpr, avatar_url etc.)
function normalizePlayer(p: any): any {
    return {
        ...p,
        // Identidade — prioriza nickname (Steam persona name) sobre name (pode ser steamId como fallback)
        name:            p.nickname || p.name || p.personaname || 'Jogador',
        avatar:          p.avatar || p.avatar_url || p.avatarfull || '/img/default-avatar.png',
        steam64_id:      p.steam64_id || p.steamid64 || '',
        // Time — API retorna team_id (ex: '2','3','A','CT') e initial_team_number ('2' ou '3')
        team_id:         String(p.team_id ?? p.team ?? p.initial_team_number ?? ''),
        initial_team_number: String(p.initial_team_number ?? p.team_id ?? p.team ?? ''),
        is_user:         !!p.is_user,
        // Estatísticas base — API local usa total_kills/dpr, Tracker usa kills/adr
        kills:           p.kills ?? p.total_kills ?? 0,
        deaths:          p.deaths ?? p.total_deaths ?? 0,
        assists:         p.assists ?? p.total_assists ?? 0,
        adr:             p.adr ?? p.dpr ?? p.average_damage_per_round ?? 0,
        kast:            p.kast ?? p.kast_percent ?? 0,
        rating:          p.rating ?? p.leetify_rating ?? 0,
        accuracy_head:   p.accuracy_head ?? (p.hs_count && p.kills ? p.hs_count / p.kills : 0),
        total_damage:    p.total_damage ?? 0,
        // FK/FD
        fk:              p.fk ?? p.fkd ?? p.first_kill_count ?? 0,
        fd:              p.fd ?? p.fk_deaths ?? p.first_death_count ?? 0,
        // Multi-kills
        triples:         p.triples ?? p.triple_kills ?? 0,
        quads:           p.quads ?? p.quad_kills ?? 0,
        aces:            p.aces ?? p.penta_kills ?? 0,
        // Avançado
        clutches:        p.clutches ?? p.clutches_won ?? 0,
        trades:          p.trades ?? 0,
        flash_assists:   p.flash_assists ?? 0,
        // Utilidades
        enemies_flashed: p.enemies_flashed ?? p.flashbang_hit_foe ?? 0,
        blind_time:      p.blind_time ?? p.total_blind_duration ?? 0,
        he_damage:       p.he_damage ?? p.utility_damage ?? 0,
        he_thrown:       p.he_thrown ?? 0,
        flash_thrown:    p.flash_thrown ?? 0,
        smokes_thrown:   p.smokes_thrown ?? 0,
        molotovs_thrown: p.molotovs_thrown ?? 0,
    };
}

const TropaPremiumMatchReportModal: React.FC<Props> = ({ matchId, isOpen, onClose, userSteamId }) => {
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'placar' | 'utilitarios' | 'combate'>('placar');

    React.useEffect(() => {
        if (isOpen && matchId) {
            setLoading(true);
            setMatch(null);
            setTab('placar');
            axios.get(`/api/match/${matchId}${userSteamId ? `?profileSteamId=${userSteamId}` : ''}`)
                .then(r => setMatch(r.data))
                .catch(() => toast.error("Erro ao carregar dados da partida"))
                .finally(() => setLoading(false));
        }
    }, [isOpen, matchId]);

    if (!isOpen) return null;

    const getMapImage = (name: string) => {
        const raw = (name || 'de_mirage').toLowerCase().trim();
        const cdn = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images';
        return `${cdn}/${raw.startsWith('de_') || raw.startsWith('cs_') ? raw : 'de_' + raw}.png`;
    };

    const rawStats: any[] = match?.stats || [];
    const stats = rawStats.map(normalizePlayer);

    // Separar times
    // API retorna initial_team_number ('2' ou '3') e team_id (valor raw do banco: '2','3','A','B','CT','T')
    const isTeam3 = (p: any) => {
        const itn = String(p.initial_team_number || '');
        const tid = String(p.team_id || '');
        return itn === '3' || tid === '3' || tid.toUpperCase() === 'CT' || tid.toUpperCase() === 'A';
    };
    const isTeam2 = (p: any) => {
        const itn = String(p.initial_team_number || '');
        const tid = String(p.team_id || '');
        return itn === '2' || tid === '2' || tid.toUpperCase() === 'T' || tid.toUpperCase() === 'B';
    };

    const t1 = stats.filter(isTeam3);
    const t2 = stats.filter(isTeam2);
    // Jogadores sem time definido vão para o time com menos jogadores
    const unassigned = stats.filter(p => !isTeam3(p) && !isTeam2(p));
    if (unassigned.length > 0) {
        console.warn('[Modal] Jogadores sem time definido:', unassigned.map(p => p.name));
    }

    // Usuário sempre "MEU TIME" primeiro
    const userInT2 = t2.some(p => p.is_user);
    const myTeam    = userInT2 ? t2 : t1;
    const enemyTeam = userInT2 ? t1 : t2;
    const myScore    = userInT2 ? (match?.team_2_score ?? 0) : (match?.team_3_score ?? 0);
    const enemyScore = userInT2 ? (match?.team_3_score ?? 0) : (match?.team_2_score ?? 0);

    const resultStr = (match?.result || '').toLowerCase();
    const isWin  = resultStr === 'win'  || resultStr === 'vitória' || resultStr === 'vitoria';
    const isLoss = resultStr === 'loss' || resultStr === 'derrota';

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">

                {/* HEADER */}
                <div className="relative h-56 shrink-0 overflow-hidden">
                    <img src={getMapImage(match?.map_name)} className="absolute inset-0 w-full h-full object-cover brightness-[0.2] scale-105" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
                    <div className="absolute top-8 left-10 right-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    isWin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                                    {isWin ? 'Vitória' : isLoss ? 'Derrota' : 'Empate'}
                                </span>
                                <span className="px-4 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Trophy size={10} /> {match?.game_mode || 'MIX'}
                                </span>
                            </div>
                            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
                                {(match?.map_name || 'PARTIDA').replace(/^de_/i, '')}
                            </h2>
                            <div className="flex items-center gap-4 mt-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <Calendar size={13} />
                                    {match?.match_date ? new Date(match.match_date).toLocaleDateString('pt-BR') : '--/--/----'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="flex items-center gap-2"><Clock size={13} /> {match?.duration || '—'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">MEU TIME</span>
                                <span className={`text-6xl font-black italic ${isWin ? 'text-emerald-500' : 'text-white'}`}>{myScore}</span>
                            </div>
                            <span className="text-3xl font-black text-zinc-800 mt-4">VS</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">INIMIGOS</span>
                                <span className={`text-6xl font-black italic ${isLoss ? 'text-red-500' : 'text-zinc-500'}`}>{enemyScore}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-8 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 transition-all">
                        <X className="text-zinc-500 hover:text-white" size={18} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex items-center justify-center gap-1 p-2 bg-zinc-900/50 border-y border-white/5 shrink-0">
                    {[
                        { id: 'placar',      label: 'Dashboard',       icon: <Activity size={15} /> },
                        { id: 'combate',     label: 'Combate Elite',   icon: <Crosshair size={15} /> },
                        { id: 'utilitarios', label: 'Utilidade',       icon: <Flame size={15} /> },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                tab === t.id ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="flex-grow overflow-y-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-14 h-14 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-5" />
                            <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-[10px]">Carregando dados...</p>
                        </div>
                    ) : stats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
                            <Target size={40} className="mb-4 opacity-30" />
                            <p className="font-black uppercase tracking-widest text-xs">Nenhum dado disponível</p>
                            <p className="text-[10px] mt-2 opacity-60">Aguardando processamento da demo...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10">

                                {tab === 'placar' && (
                                    <>
                                        <TeamTable title="MEU TIME"    players={myTeam}    isEnemy={false} />
                                        <TeamTable title="ADVERSÁRIOS" players={enemyTeam} isEnemy={true} />
                                    </>
                                )}

                                {tab === 'combate' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Entry Kills & Clutches */}
                                        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-5 flex items-center gap-2"><Zap size={16} /> Impacto e Abertura</h3>
                                            <div className="space-y-3">
                                                {[...myTeam].sort((a,b) => (b.fk||0)-(a.fk||0)).map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.avatar} onError={(e: any) => e.target.src='/img/default-avatar.png'} className="w-9 h-9 rounded-xl object-cover" alt="" />
                                                            <div>
                                                                <div className="text-xs font-black text-white">{p.name}</div>
                                                                <div className="text-[10px] text-zinc-600 font-bold">{p.rating?.toFixed(2)} RT</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-6">
                                                            {[['ENTRY',   p.fk||0,       'text-emerald-400'],
                                                              ['CLUTCH',  p.clutches||0, 'text-yellow-400'],
                                                              ['TRADES',  p.trades||0,   'text-blue-400']].map(([lbl, val, cls]) => (
                                                                <div key={lbl as string} className="flex flex-col items-center">
                                                                    <span className="text-[9px] text-zinc-600 font-bold mb-0.5">{lbl}</span>
                                                                    <span className={`text-sm font-black ${cls}`}>{val}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Precisão */}
                                        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-5 flex items-center gap-2"><Target size={16} /> Precisão de Elite</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {myTeam.slice(0,4).map((p, i) => (
                                                    <div key={i} className="p-4 bg-white/5 rounded-2xl flex flex-col items-center">
                                                        <img src={p.avatar} onError={(e: any) => e.target.src='/img/default-avatar.png'} className="w-11 h-11 rounded-xl object-cover mb-2" alt="" />
                                                        <div className="text-[10px] font-black text-white mb-2 truncate w-full text-center">{p.name}</div>
                                                        <div className="grid grid-cols-2 gap-1.5 w-full">
                                                            <div className="bg-black/40 p-2 rounded-xl text-center">
                                                                <div className="text-[8px] text-zinc-600 font-bold">HS%</div>
                                                                <div className="text-xs font-black text-rose-400">{((p.accuracy_head||0)*100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="bg-black/40 p-2 rounded-xl text-center">
                                                                <div className="text-[8px] text-zinc-600 font-bold">ADR</div>
                                                                <div className="text-xs font-black text-amber-400">{(p.adr||0).toFixed(0)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab === 'utilitarios' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <StatCard title="Dano de HE"      value={myTeam.reduce((a,p)=>a+(p.he_damage||0),0)}      icon={<Zap className="text-orange-400" size={16}/>} />
                                            <StatCard title="Inimigos Cegos"  value={myTeam.reduce((a,p)=>a+(p.enemies_flashed||0),0)} icon={<Eye className="text-yellow-400" size={16}/>} />
                                            <StatCard title="Tempo Cegueira"  value={`${myTeam.reduce((a,p)=>a+(p.blind_time||0),0).toFixed(1)}s`} icon={<Clock className="text-blue-400" size={16}/>} />
                                            <StatCard title="Flash Assists"   value={myTeam.reduce((a,p)=>a+(p.flash_assists||0),0)}  icon={<Star className="text-purple-400" size={16}/>} />
                                        </div>
                                        <TeamTable title="EFICIÊNCIA TÁTICA" players={myTeam} isEnemy={false} variant="utility" />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-5 bg-black/50 border-t border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Diferencial TropaCS</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Análise de Demo Local</span></div>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 text-[10px] font-black uppercase tracking-widest">
                            <Download size={14} /> Demo
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-all text-[10px] font-black uppercase tracking-widest">
                            <BarChart2 size={14} /> Relatório
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

type SortKey = 'rating' | 'kills' | 'deaths' | 'assists' | 'adr' | 'accuracy_head' | 'kast' | 'total_damage';

const TeamTable = ({ title, players, isEnemy, variant = 'full' }: { title: string; players: any[]; isEnemy: boolean; variant?: 'full' | 'utility' }) => {
    const [sortKey, setSortKey] = React.useState<SortKey>('total_damage');
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = [...players].sort((a, b) => {
        const va = Number(a[sortKey] ?? 0);
        const vb = Number(b[sortKey] ?? 0);
        return sortDir === 'desc' ? vb - va : va - vb;
    });

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <span className="text-zinc-800 ml-1 text-[8px]">⇅</span>;
        return <span className="text-yellow-500 ml-1 text-[8px]">{sortDir === 'desc' ? '▼' : '▲'}</span>;
    };

    const Th = ({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) => (
        <th
            className={`px-3 py-3 text-center cursor-pointer select-none hover:text-zinc-300 transition-colors ${sortKey === k ? 'text-yellow-500' : ''} ${className}`}
            onClick={() => handleSort(k)}
        >
            <span className="flex items-center justify-center gap-0.5">{label}<SortIcon k={k} /></span>
        </th>
    );

    return (
        <div className="space-y-3">
            <h3 className={`text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isEnemy ? 'text-zinc-600' : 'text-emerald-500'}`}>
                <span className={`w-1 h-4 rounded-full ${isEnemy ? 'bg-zinc-700' : 'bg-emerald-500'}`} />
                {title}
                <span className="text-zinc-700 font-bold text-[9px]">{players.length} jogadores</span>
            </h3>
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/20">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[9px] font-black uppercase text-zinc-600 tracking-widest bg-white/5 border-b border-white/5">
                            <th className="px-5 py-3">Jogador</th>
                            {variant === 'full' ? (
                                <>
                                    <Th label="Rating" k="rating" />
                                    <Th label="K" k="kills" />
                                    <Th label="D" k="deaths" />
                                    <Th label="A" k="assists" />
                                    <Th label="ADR" k="adr" />
                                    <Th label="HS%" k="accuracy_head" />
                                    <Th label="KAST" k="kast" />
                                    <Th label="Dano" k="total_damage" />
                                </>
                            ) : (
                                <>
                                    <th className="px-3 py-3 text-center">Dano HE</th>
                                    <th className="px-3 py-3 text-center">Cegou</th>
                                    <th className="px-3 py-3 text-center">Blind</th>
                                    <th className="px-3 py-3 text-center">HEs</th>
                                    <th className="px-3 py-3 text-center">Fls</th>
                                    <th className="px-3 py-3 text-center">Smks</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {sorted.map((p, i) => (
                            <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${p.is_user ? 'bg-yellow-500/5' : ''}`}>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <img
                                                src={p.avatar}
                                                onError={(e: any) => { e.target.src = '/img/default-avatar.png'; }}
                                                className="w-9 h-9 rounded-xl border border-white/10 object-cover"
                                                alt=""
                                            />
                                            {p.is_user && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-zinc-950" />}
                                        </div>
                                        <div className="min-w-0">
                                            {p.steam64_id ? (
                                                <a
                                                    href={`/player/${p.steam64_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="group flex items-center gap-1 hover:text-yellow-400 transition-colors"
                                                >
                                                    <span className="text-xs font-black text-white group-hover:text-yellow-400 truncate max-w-[110px] transition-colors">{p.name}</span>
                                                    <svg className="w-2.5 h-2.5 text-zinc-700 group-hover:text-yellow-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            ) : (
                                                <div className="text-xs font-black text-white truncate max-w-[120px]">{p.name}</div>
                                            )}
                                            <div className="text-[9px] text-zinc-600 font-bold uppercase">{p.metadata?.role || 'Rifler'}</div>
                                        </div>
                                    </div>
                                </td>
                                {variant === 'full' ? (
                                    <>
                                        <td className={`px-3 py-3 text-center font-black text-sm italic ${(p.rating||0) >= 1.2 ? 'text-emerald-400' : (p.rating||0) < 0.8 ? 'text-rose-400' : 'text-white'} ${sortKey === 'rating' ? 'bg-yellow-500/5' : ''}`}>
                                            {(p.rating||0).toFixed(2)}
                                        </td>
                                        <td className={`px-3 py-3 text-center text-xs text-white font-black ${sortKey === 'kills' ? 'bg-yellow-500/5' : ''}`}>{p.kills}</td>
                                        <td className={`px-3 py-3 text-center text-xs text-zinc-400 font-bold ${sortKey === 'deaths' ? 'bg-yellow-500/5' : ''}`}>{p.deaths}</td>
                                        <td className={`px-3 py-3 text-center text-xs text-zinc-400 font-bold ${sortKey === 'assists' ? 'bg-yellow-500/5' : ''}`}>{p.assists}</td>
                                        <td className={`px-3 py-3 text-center text-xs font-black text-zinc-300 ${sortKey === 'adr' ? 'bg-yellow-500/5' : ''}`}>{(p.adr||0).toFixed(1)}</td>
                                        <td className={`px-3 py-3 text-center text-xs text-zinc-500 font-bold ${sortKey === 'accuracy_head' ? 'bg-yellow-500/5' : ''}`}>{((p.accuracy_head||0)*100).toFixed(0)}%</td>
                                        <td className={`px-3 py-3 text-center text-xs text-zinc-500 font-bold ${sortKey === 'kast' ? 'bg-yellow-500/5' : ''}`}>
                                            {p.kast > 1 ? p.kast.toFixed(0) : (p.kast * 100).toFixed(0)}%
                                        </td>
                                        <td className={`px-3 py-3 text-center text-xs font-black text-yellow-500/80 ${sortKey === 'total_damage' ? 'bg-yellow-500/5' : ''}`}>{p.total_damage || 0}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-3 py-3 text-center text-orange-400 font-black text-xs">{p.he_damage || 0}</td>
                                        <td className="px-3 py-3 text-center text-yellow-400 font-black text-xs">{p.enemies_flashed || 0}</td>
                                        <td className="px-3 py-3 text-center text-blue-400 font-bold text-xs">{(p.blind_time||0).toFixed(1)}s</td>
                                        <td className="px-3 py-3 text-center text-zinc-500 text-xs">{p.he_thrown||0}</td>
                                        <td className="px-3 py-3 text-center text-zinc-500 text-xs">{p.flash_thrown||0}</td>
                                        <td className="px-3 py-3 text-center text-zinc-500 text-xs">{p.smokes_thrown||0}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon }: { title: string; value: any; icon: any }) => (
    <div className="p-5 bg-zinc-900/40 rounded-2xl border border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{title}</span>
            <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
        </div>
        <div className="text-3xl font-black italic tracking-tighter text-white">{value}</div>
    </div>
);

export default TropaPremiumMatchReportModal;
