"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Download, Calendar, Activity, Target, Zap, Clock, X, 
    Crosshair, TrendingUp, Star, Eye, Trophy, BarChart2, Flame, DollarSign, Shield, Skull, Heart, Swords, ChevronUp,
    Cloud, Bomb
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
        rating:          p.rating2 ?? p.rating ?? p.leetify_rating ?? 0,
        impact:          p.impact ?? p.impact_rating ?? p.impactRating ?? 0,
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
        he_damage:       p.he_damage ?? p.utility_damage_he ?? p.util_damage_he ?? p.heDamage ?? p.he_dmg ?? p.heDmg ?? 0,
        he_thrown:       p.he_thrown ?? 0,
        flash_thrown:    p.flash_thrown ?? 0,
        smokes_thrown:   p.smokes_thrown ?? 0,
        molotovs_thrown: p.molotovs_thrown ?? 0,
    };
}

const TropaPremiumMatchReportModal: React.FC<Props> = ({ matchId, isOpen, onClose, userSteamId }) => {
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [tab, setTab] = useState<'placar' | 'utilitarios' | 'combate' | 'economia' | 'confrontos' | 'arsenal'>('placar');
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.isAdmin;

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

    const handleRecalculateElo = async () => {
        if (!matchId || recalculating) return;
        setRecalculating(true);
        try {
            await axios.post('/api/admin/recalculate-match-elo', { matchId });
            toast.success("Tropoints recalculados com sucesso!");
            // Recarregar dados da partida
            const r = await axios.get(`/api/match/${matchId}${userSteamId ? `?profileSteamId=${userSteamId}` : ''}`);
            setMatch(r.data);
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao recalcular elo");
        } finally {
            setRecalculating(false);
        }
    };

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

    const t1Initial = stats.filter(isTeam3);
    const t2Initial = stats.filter(isTeam2);
    const unassigned = stats.filter(p => !isTeam3(p) && !isTeam2(p));

    const t1 = [...t1Initial];
    const t2 = [...t2Initial];

    unassigned.forEach(p => {
        if (t1.length <= t2.length) t1.push(p);
        else t2.push(p);
    });

    // Usuário sempre "MEU TIME" primeiro
    const userInT2 = t2.some(p => p.is_user);
    const myTeam    = userInT2 ? t2 : t1;
    const enemyTeam = userInT2 ? t1 : t2;
    const myScore    = userInT2 ? (match?.team_2_score ?? 0) : (match?.team_3_score ?? 0);
    const enemyScore = userInT2 ? (match?.team_3_score ?? 0) : (match?.team_2_score ?? 0);

    const resultStr = (match?.result || '').toLowerCase();
    const isWin  = resultStr === 'win'  || resultStr === 'vitoria';
    const isLoss = resultStr === 'loss' || resultStr === 'derrota';

    return (
        <div className="fixed inset-0 z-[999] overflow-y-auto" onClick={onClose}>
            {/* Backdrop fixo e borrado */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/95 backdrop-blur-2xl" 
            />

            <div className="relative min-h-screen flex items-start justify-center p-4 md:p-12">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-[1450px] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl flex flex-col"
                >

                {/* HEADER PREMIUM REESTILIZADA */}
                <div className="relative h-72 shrink-0 overflow-hidden rounded-t-[40px] border-b border-white/5">
                    {/* Imagem do Mapa com efeitos */}
                    <img 
                        src={getMapImage(match?.map_name)} 
                        className="absolute inset-0 w-full h-full object-cover brightness-[0.25] scale-110 blur-[1px]" 
                        alt="" 
                    />
                    
                    {/* Gradients de Profundidade */}
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

                    <div className="absolute inset-0 p-12 flex justify-between items-end">
                        <div className="relative z-10 flex flex-col">
                            {/* Badges Superiores */}
                            <div className="flex items-center gap-3 mb-4">
                                <motion.span 
                                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-md border ${
                                    isWin ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    isLoss ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                    'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
                                    {isWin ? 'Vitória' : isLoss ? 'Derrota' : 'Empate'}
                                </motion.span>
                                <span className="px-4 py-1.5 rounded-lg bg-white/5 text-yellow-500 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md flex items-center gap-2">
                                    <Star size={10} fill="currentColor" /> {match?.game_mode || 'COMPETITIVO'}
                                </span>
                            </div>

                            {/* Nome do Mapa */}
                            <h2 className="text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl leading-none mb-4">
                                {(match?.map_name || 'PARTIDA').replace(/^de_/i, '')}
                            </h2>

                            {/* Info de Data e Match ID */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                                    <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Calendar size={12} className="text-zinc-400" />
                                        {match?.match_date ? new Date(match.match_date).toLocaleDateString('pt-BR') : '--/--/----'}
                                    </span>
                                    <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Clock size={12} className="text-zinc-400" /> 
                                        {match?.duration || '—'}
                                    </span>
                                </div>
                                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 bg-black/40 w-fit px-4 py-2 rounded-xl border border-white/5">
                                    <span className="text-yellow-500/60">SESSION ID:</span>
                                    <span className="text-zinc-400 select-all font-mono">{(match?.match_id || match?.id || matchId || '—').substring(0, 16).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* PLACAR CENTRAL ESTILIZADO */}
                        <div className="relative flex items-center gap-12 bg-zinc-950/40 p-10 rounded-[40px] border border-white/5 backdrop-blur-xl shadow-2xl">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-yellow-500 rounded-full">
                                <span className="text-[8px] font-black text-black uppercase tracking-[0.3em]">Scoreboard</span>
                            </div>

                            {/* Meu Time */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Meu Time</span>
                                <div className={`relative text-7xl font-black italic tracking-tighter leading-none ${isWin ? 'text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-white'}`}>
                                    {myScore}
                                </div>
                            </div>

                            {/* Divisor VS */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                <span className="text-xs font-black text-zinc-800 italic uppercase">VS</span>
                                <div className="w-px h-12 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
                            </div>

                            {/* Inimigos */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Adversários</span>
                                <div className={`relative text-7xl font-black italic tracking-tighter leading-none ${isLoss ? 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'text-zinc-400'}`}>
                                    {enemyScore}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botão de Fechar */}
                    <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 transition-all group z-50">
                        <X className="text-zinc-500 group-hover:text-white group-hover:rotate-90 transition-all" size={20} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex items-center justify-center gap-1 p-2 bg-zinc-900/50 border-y border-white/5 shrink-0">
                    {[
                        { id: 'placar',      label: 'Dashboard',       icon: <Activity size={15} /> },
                        { id: 'combate',     label: 'Combate Elite',   icon: <Crosshair size={15} /> },
                        { id: 'confrontos',  label: 'Confrontos',      icon: <Swords size={15} /> },
                        { id: 'arsenal',     label: 'Arsenal',         icon: <Shield size={15} /> },
                        { id: 'utilitarios', label: 'Utilidade',       icon: <Flame size={15} /> },
                        { id: 'economia',    label: 'Economia',        icon: <DollarSign size={15} /> },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                tab === t.id ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="flex-grow p-8">
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
                            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">

                                {tab === 'placar' && (
                                    <>
                                        <TeamTable title="MEU TIME"    players={myTeam}    isEnemy={false} />
                                        <TeamTable title="ADVERSARIOS" players={enemyTeam} isEnemy={true} />
                                    </>
                                )}

                                {tab === 'combate' && (
                                    <div className="space-y-12">
                                        {/* Impacto e Abertura - Agora para os dois times */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* MEU TIME */}
                                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-emerald-500/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={80} /></div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2">
                                                    <Zap size={16} /> Impacto e Abertura: Meu Time
                                                </h3>
                                                <div className="space-y-3">
                                                    {[...myTeam].sort((a,b) => (b.fk||0)-(a.fk||0)).map((p, i) => (
                                                        <ImpactRow key={i} p={p} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* INIMIGOS */}
                                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-red-500/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={80} /></div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-6 flex items-center gap-2">
                                                    <Zap size={16} /> Impacto e Abertura: Inimigos
                                                </h3>
                                                <div className="space-y-3">
                                                    {[...enemyTeam].sort((a,b) => (b.fk||0)-(a.fk||0)).map((p, i) => (
                                                        <ImpactRow key={i} p={p} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Precisão de Elite - Agora para os dois times */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* MEU TIME */}
                                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-emerald-500/10">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2">
                                                    <Target size={16} /> Precisão de Elite: Meu Time
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                                    {myTeam.map((p, i) => (
                                                        <PrecisionCard key={i} p={p} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* INIMIGOS */}
                                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-red-500/10">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-6 flex items-center gap-2">
                                                    <Target size={16} /> Precisão de Elite: Inimigos
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                                    {enemyTeam.map((p, i) => (
                                                        <PrecisionCard key={i} p={p} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab === 'utilitarios' && (
                                    <div className="space-y-12">
                                        <div className="space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Resumo de Utilidade: MEU TIME
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <StatCard title="Dano de HE"      value={myTeam.reduce((a,p)=>a+(p.he_damage||0),0)}      icon={<Zap className="text-orange-400" size={16}/>} />
                                                <StatCard title="Inimigos Cegos"  value={myTeam.reduce((a,p)=>a+(p.enemies_flashed||0),0)} icon={<Eye className="text-yellow-400" size={16}/>} />
                                                <StatCard title="Tempo Cegueira"  value={`${myTeam.reduce((a,p)=>a+(p.blind_time||0),0).toFixed(1)}s`} icon={<Clock className="text-blue-400" size={16}/>} />
                                                <StatCard title="Flash Assists"   value={myTeam.reduce((a,p)=>a+(p.flash_assists||0),0)}  icon={<Star className="text-purple-400" size={16}/>} />
                                            </div>
                                            <TeamTable title="EFICIÊNCIA TÁTICA" players={myTeam} isEnemy={false} variant="utility" />
                                        </div>

                                        <div className="space-y-6 opacity-80">
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                Resumo de Utilidade: ADVERSARIOS
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <StatCard title="Dano de HE"      value={enemyTeam.reduce((a,p)=>a+(p.he_damage||0),0)}      icon={<Zap className="text-orange-400/50" size={16}/>} />
                                                <StatCard title="Inimigos Cegos"  value={enemyTeam.reduce((a,p)=>a+(p.enemies_flashed||0),0)} icon={<Eye className="text-yellow-400/50" size={16}/>} />
                                                <StatCard title="Tempo Cegueira"  value={`${enemyTeam.reduce((a,p)=>a+(p.blind_time||0),0).toFixed(1)}s`} icon={<Clock className="text-blue-400/50" size={16}/>} />
                                                <StatCard title="Flash Assists"   value={enemyTeam.reduce((a,p)=>a+(p.flash_assists||0),0)}  icon={<Star className="text-purple-400/50" size={16}/>} />
                                            </div>
                                            <TeamTable title="EFICIENCIA TATICA" players={enemyTeam} isEnemy={true} variant="utility" />
                                        </div>

                                        {/* Utility Timeline */}
                                        <div className="pt-8 border-t border-white/5">
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500 flex items-center gap-3 mb-8">
                                                <BarChart2 size={16} />
                                                Linha do Tempo: Utilidade por Rodada
                                            </h3>
                                            <UtilityTimeline timeline={match?.utility_timeline} players={stats} />
                                        </div>
                                    </div>
                                )}

                                {tab === 'economia' && (
                                    <EconomyLog economy={match?.economy_timeline || match?.metadata?.economy_timeline} />
                                )}

                                {tab === 'confrontos' && (
                                    <ConfrontosTimeline 
                                        timeline={match?.kill_timeline || match?.metadata?.kill_timeline} 
                                        players={stats} 
                                        damageTimeline={match?.damage_timeline || match?.metadata?.damage_timeline} 
                                        detailedDamageTimeline={match?.detailed_damage_timeline || match?.metadata?.detailed_damage_timeline}
                                    />
                                )}

                                {tab === 'arsenal' && (
                                    <ArsenalLog weaponStats={match?.metadata?.weapon_stats || []} players={stats} match={match} />
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
                        {isAdmin && (
                            <button 
                                onClick={handleRecalculateElo}
                                disabled={recalculating}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl transition-all border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                <TrendingUp size={14} className={recalculating ? 'animate-pulse' : ''} />
                                {recalculating ? 'Recalculando...' : 'Atualizar Tropoints'}
                            </button>
                        )}
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 text-[10px] font-black uppercase tracking-widest">
                            <Download size={14} /> Demo
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-all text-[10px] font-black uppercase tracking-widest">
                            <BarChart2 size={14} /> Relatorio
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
    );
};

// --- SUB-COMPONENTS ---

type SortKey = 'rating' | 'impact' | 'kills' | 'deaths' | 'assists' | 'adr' | 'accuracy_head' | 'kast' | 'total_damage';

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
                <table className="w-full text-left table-fixed">
                    <thead>
                        <tr className="text-[9px] font-black uppercase text-zinc-600 tracking-widest bg-white/5 border-b border-white/5">
                            <th className="px-5 py-3 w-[220px]">Jogador</th>
                            {variant === 'full' ? (
                                <>
                                    <Th label="Rating" k="rating" className="w-[80px]" />
                                    <Th label="IMP" k="impact" className="w-[80px]" />
                                    <Th label="K" k="kills" className="w-[60px]" />
                                    <Th label="D" k="deaths" className="w-[60px]" />
                                    <Th label="A" k="assists" className="w-[60px]" />
                                    <Th label="ADR" k="adr" className="w-[90px]" />
                                    <Th label="HS%" k="accuracy_head" className="w-[80px]" />
                                    <Th label="KAST" k="kast" className="w-[80px]" />
                                    <Th label="Dano" k="total_damage" className="w-[100px]" />
                                </>
                            ) : (
                                <>
                                    <th className="px-3 py-3 text-center w-[80px]">Dano HE</th>
                                    <th className="px-3 py-3 text-center w-[80px]">Cegou</th>
                                    <th className="px-3 py-3 text-center w-[80px]">Blind</th>
                                    <th className="px-3 py-3 text-center w-[60px]">HEs</th>
                                    <th className="px-3 py-3 text-center w-[60px]">Fls</th>
                                    <th className="px-3 py-3 text-center w-[60px]">Smks</th>
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
                                        <td className={`px-3 py-3 text-center font-black text-[11px] italic ${(p.impact||0) >= 1.2 ? 'text-orange-400' : (p.impact||0) < 0.8 ? 'text-zinc-500' : 'text-yellow-400'} ${sortKey === 'impact' ? 'bg-yellow-500/5' : ''}`}>
                                            {(p.impact||0) > 0 ? (p.impact||0).toFixed(2) : '—'}
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

const ImpactRow = ({ p }: { p: any }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
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
);

const PrecisionCard = ({ p }: { p: any }) => (
    <div className="p-3 bg-white/5 rounded-2xl flex flex-col items-center border border-white/5 hover:border-white/10 transition-all">
        <img src={p.avatar} onError={(e: any) => e.target.src='/img/default-avatar.png'} className="w-10 h-10 rounded-xl object-cover mb-2" alt="" />
        <div className="text-[9px] font-black text-white mb-2 truncate w-full text-center">{p.name}</div>
        <div className="flex flex-col gap-1 w-full">
            <div className="bg-black/40 p-1.5 rounded-lg text-center">
                <div className="text-[7px] text-zinc-600 font-bold uppercase leading-none">HS%</div>
                <div className="text-[10px] font-black text-rose-400 mt-1">{((p.accuracy_head||0)*100).toFixed(0)}%</div>
            </div>
            <div className="bg-black/40 p-1.5 rounded-lg text-center">
                <div className="text-[7px] text-zinc-600 font-bold uppercase leading-none">ADR</div>
                <div className="text-[10px] font-black text-amber-400 mt-1">{(p.adr||0).toFixed(0)}</div>
            </div>
        </div>
    </div>
);

const UtilityTimeline = ({ timeline, players }: { timeline: any; players: any[] }) => {
    if (!timeline || Object.keys(timeline).length === 0) {
        return (
            <div className="bg-zinc-900/20 p-12 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-3">
                <BarChart2 size={32} className="text-zinc-800" />
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest text-center">
                    Linha do tempo nao disponivel para esta partida.<br />
                    <span className="text-zinc-700 font-bold normal-case">Requer processamento completo da demo.</span>
                </p>
            </div>
        );
    }

    const rounds = Object.keys(timeline).map(Number).sort((a, b) => a - b);
    
    const getPlayerData = (sid: string) => {
        const p = players.find(p => String(p.steam64_id || p.steamid64) === sid);
        return {
            avatar: p?.avatar || '/img/default-avatar.png',
            name: p?.name || p?.nickname || 'Desconhecido',
            team: p?.team_id || p?.initial_team_number || 'x'
        };
    };

    const getGrenadeIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('flash')) return <Zap size={12} className="text-yellow-400" />;
        if (t.includes('smoke')) return <Cloud size={12} className="text-sky-300" />;
        if (t.includes('molotov') || t.includes('incendiary') || t.includes('fire')) return <Flame size={12} className="text-orange-400" />;
        if (t.includes('he') || t.includes('grenade')) return <Bomb size={12} className="text-red-400" />;
        if (t.includes('decoy')) return <Target size={12} className="text-zinc-400" />;
        return <Activity size={12} className="text-zinc-500" />;
    };

    const getGrenadeClass = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('flash')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
        if (t.includes('smoke')) return 'bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]';
        if (t.includes('molotov') || t.includes('incendiary') || t.includes('fire')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_15px_rgba(251,146,60,0.2)]';
        if (t.includes('he') || t.includes('grenade')) return 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
        if (t.includes('decoy')) return 'bg-zinc-500/20 text-zinc-300 border-white/20';
        return 'bg-zinc-500/10 text-zinc-400 border-white/10';
    };

    return (
        <div className="space-y-8">
            {rounds.map(rNum => {
                const events = timeline[rNum] || [];
                const t1Events = events.filter((e: any) => {
                    const t = getPlayerData(e.steamId).team;
                    return t === '3' || t === 'CT' || t === 'A';
                });
                const t2Events = events.filter((e: any) => {
                    const t = getPlayerData(e.steamId).team;
                    return t === '2' || t === 'T' || t === 'B';
                });

                return (
                    <div key={rNum} className="flex gap-6 group">
                        <div className="w-16 h-16 rounded-[24px] bg-zinc-950 border border-white/5 flex flex-col items-center justify-center shrink-0 group-hover:border-yellow-500/40 transition-all shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] leading-none mb-1 z-10">ROUND</span>
                            <span className="text-2xl font-black text-white italic leading-none z-10">{rNum === 0 ? 'FACA' : rNum}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                            {/* Counter-Terrorists Row */}
                            <div className="flex items-center gap-4 bg-zinc-900/20 border border-white/[0.03] rounded-[28px] p-2.5 pr-5 overflow-x-auto no-scrollbar min-h-[60px] hover:bg-zinc-900/30 transition-colors">
                                <div className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-xl shrink-0">
                                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">TEAM CT</span>
                                </div>
                                {t1Events.length === 0 ? (
                                    <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest ml-4 italic">Sem utilidade registrada</span>
                                ) : (
                                    t1Events.map((ge: any, idx: number) => (
                                        <PremiumGrenadeItem key={idx} ge={ge} getPlayerData={getPlayerData} getGrenadeIcon={getGrenadeIcon} getGrenadeClass={getGrenadeClass} />
                                    ))
                                )}
                            </div>

                            {/* Terrorists Row */}
                            <div className="flex items-center gap-4 bg-zinc-900/20 border border-white/[0.03] rounded-[28px] p-2.5 pr-5 overflow-x-auto no-scrollbar min-h-[60px] hover:bg-zinc-900/30 transition-colors">
                                <div className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl shrink-0">
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">TEAM TR</span>
                                </div>
                                {t2Events.length === 0 ? (
                                    <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest ml-4 italic">Sem utilidade registrada</span>
                                ) : (
                                    t2Events.map((ge: any, idx: number) => (
                                        <PremiumGrenadeItem key={idx} ge={ge} getPlayerData={getPlayerData} getGrenadeIcon={getGrenadeIcon} getGrenadeClass={getGrenadeClass} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const PremiumGrenadeItem = ({ ge, getPlayerData, getGrenadeIcon, getGrenadeClass }: any) => {
    const p = getPlayerData(ge.steamId);
    const damage = ge.damage || ge.he_damage || 0;
    
    return (
        <div className={`flex items-center gap-3 p-2 pr-4 rounded-[20px] border ${getGrenadeClass(ge.type)} shrink-0 shadow-lg hover:scale-105 transition-all duration-300 bg-zinc-950/60 backdrop-blur-md`}>
            <img src={p.avatar} className="w-6 h-6 rounded-lg object-cover border border-black/40 shadow-xl" alt="" />
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    {getGrenadeIcon(ge.type)}
                    <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{ge.type?.replace('Eq', '').replace(/GRENADE/gi, '').trim().toUpperCase()}</span>
                </div>
                <div className="text-[8px] font-black opacity-40 uppercase truncate max-w-[60px] tracking-widest">{p.name}</div>
            </div>
            
            {(ge.blind_duration > 0 || damage > 0) && (
                <div className="ml-2 pl-3 border-l border-white/10 flex flex-col justify-center">
                    {ge.blind_duration > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-yellow-500 italic leading-none">{ge.blind_duration.toFixed(1)}s</span>
                            <span className="text-[7px] font-black opacity-30 uppercase">Cegou</span>
                        </div>
                    )}
                    {damage > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-black text-red-500 italic leading-none">{Math.round(damage)}</span>
                            <span className="text-[7px] font-black opacity-30 uppercase">Dano</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const EconomyLog: React.FC<{ economy: any }> = ({ economy }) => {
    if (!economy) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600 bg-black/20 rounded-[40px] border border-dashed border-white/[0.03]">
            <DollarSign size={48} strokeWidth={1} className="mb-4 text-emerald-500/20" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Dados de economia indisponíveis</h4>
            <p className="text-[10px] uppercase text-zinc-700 mt-2 font-bold tracking-widest">Aguardando análise completa da demo</p>
        </div>
    );

    const rounds = Object.keys(economy).map(Number).sort((a, b) => a - b);
    
    let totalSpendCT = 0;
    let totalSpendT = 0;
    let ctRounds = 0;
    let tRounds = 0;

    rounds.forEach(rNum => {
        const data = economy[rNum];
        if (data.ct_equipment_value) { totalSpendCT += data.ct_equipment_value; ctRounds++; }
        if (data.t_equipment_value) { totalSpendT += data.t_equipment_value; tRounds++; }
    });

    const avgCT = ctRounds > 0 ? Math.round(totalSpendCT / ctRounds) : 0;
    const avgT = tRounds > 0 ? Math.round(totalSpendT / tRounds) : 0;

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val).replace('$', '$ ');
    };

    const getBuyTypeColor = (type: string) => {
        const t = String(type).toLowerCase();
        if (t.includes('full')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (t.includes('semi') || t.includes('force')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        if (t.includes('eco')) return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (t.includes('pistol')) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
        return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    };

    return (
        <div className="space-y-12 pb-10">
            {/* Summary Cards Premium */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-sky-500/10 via-zinc-900/40 to-transparent border border-sky-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Shield size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                                <Shield className="text-white" size={24} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400 mb-1">Time CT</h4>
                                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Investimento Médio</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <span className="text-5xl font-black italic text-white tracking-tighter leading-none">{formatMoney(avgCT)}</span>
                            <div className="flex-1 max-w-[150px] mb-2">
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner p-0.5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (avgCT / 30000) * 100)}%` }}
                                        className="h-full bg-sky-500 rounded-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 via-zinc-900/40 to-transparent border border-orange-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Target size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Target className="text-white" size={24} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-1">Time T</h4>
                                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Investimento Médio</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <span className="text-5xl font-black italic text-white tracking-tighter leading-none">{formatMoney(avgT)}</span>
                            <div className="flex-1 max-w-[150px] mb-2">
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner p-0.5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (avgT / 30000) * 100)}%` }}
                                        className="h-full bg-orange-500 rounded-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Table Content */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-white/[0.03] border-b border-white/[0.05]">
                                <th className="py-6 px-10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center">Round</th>
                                <th className="py-6 px-10 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">Time CT</th>
                                <th className="py-6 px-10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center">Spread</th>
                                <th className="py-6 px-10 text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 text-right">Time T</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {rounds.map(rNum => {
                                const r = economy[rNum];
                                const maxVal = Math.max(r.ct_equipment_value || 0, r.t_equipment_value || 0, 30000);
                                const ctWidth = ((r.ct_equipment_value || 0) / maxVal) * 100;
                                const tWidth = ((r.t_equipment_value || 0) / maxVal) * 100;
                                
                                return (
                                    <tr key={rNum} className="group hover:bg-white/[0.01] transition-all duration-300">
                                        <td className="py-6 px-10">
                                            <div className="flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-[20px] bg-zinc-950 border border-white/5 flex items-center justify-center group-hover:border-yellow-500/30 group-hover:scale-105 transition-all shadow-inner">
                                                    <span className="text-2xl font-black italic text-zinc-700 group-hover:text-yellow-500 transition-colors">{Number(rNum) === 0 ? 'FACA' : rNum}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-10">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3">
                                                    <Shield size={14} className="text-sky-500/50" />
                                                    <span className="text-xl font-black italic text-sky-300 tracking-tight">{formatMoney(r.ct_equipment_value || 0)}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border w-fit mt-3 shadow-lg ${getBuyTypeColor(r.ct_buy_type)}`}>
                                                    {r.ct_buy_type || 'Desconhecido'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-3 h-3 w-full bg-black/60 rounded-full overflow-hidden p-1 shadow-inner border border-white/5">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${ctWidth/2}%` }}
                                                    viewport={{ once: true }}
                                                    className="h-full bg-sky-500 rounded-l-full shadow-[0_0_20px_rgba(56,189,248,0.5)]" 
                                                />
                                                <div className="w-0.5 h-full bg-white/20" />
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${tWidth/2}%` }}
                                                    viewport={{ once: true }}
                                                    className="h-full bg-orange-500 rounded-r-full shadow-[0_0_20px_rgba(249,115,22,0.5)]" 
                                                />
                                            </div>
                                        </td>
                                        <td className="py-6 px-10 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl font-black italic text-orange-300 tracking-tight">{formatMoney(r.t_equipment_value || 0)}</span>
                                                    <Target size={14} className="text-orange-500/50" />
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border w-fit mt-3 shadow-lg ${getBuyTypeColor(r.t_buy_type)}`}>
                                                    {r.t_buy_type || 'Desconhecido'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const weaponImg = (name: string) => {
    if (!name) return '';
    let cleanName = name.toLowerCase().replace('weapon_', '').trim();
    
    if (cleanName === 'world' || cleanName === 'worldspawn') {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>';
    }

    if (cleanName === 'smokegrenade' || cleanName === 'smoke') {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>';
    }
    
    const MAPPING: Record<string, string> = {
        // Rifles
        'ak47': 'ak47', 'ak-47': 'ak47', 'ak_47': 'ak47', 'ak 47': 'ak47',
        'm4a4': 'm4a1', 'm4-a4': 'm4a1', 'm4 a4': 'm4a1',
        'm4a1': 'm4a1_silencer', 'm4-a1': 'm4a1_silencer', 'm4 a1': 'm4a1_silencer',
        'm4a1_s': 'm4a1_silencer', 'm4a1-s': 'm4a1_silencer', 'm4a1_silencer': 'm4a1_silencer', 'm4a1 s': 'm4a1_silencer',
        'famas': 'famas', 'galilar': 'galilar', 'galil': 'galilar', 'galil ar': 'galilar', 'galil-ar': 'galilar',
        'aug': 'aug', 'sg556': 'sg556', 'sg553': 'sg556', 'sg-553': 'sg556', 'sg 553': 'sg556',
        'awp': 'awp', 'ssg08': 'ssg08', 'ssg-08': 'ssg08', 'ssg 08': 'ssg08', 'scout': 'ssg08', 
        'g3sg1': 'g3sg1', 'g3-sg1': 'g3sg1', 'g3 sg1': 'g3sg1', 'scar20': 'scar20', 'scar-20': 'scar20', 'scar 20': 'scar20',
        
        // SMGs
        'mac10': 'mac10', 'mac-10': 'mac10', 'mac 10': 'mac10', 
        'mp9': 'mp9', 'mp7': 'mp7', 'mp5sd': 'mp5sd', 'mp5-sd': 'mp5sd', 'mp5 sd': 'mp5sd', 'mp5': 'mp5sd',
        'ump45': 'ump45', 'ump-45': 'ump45', 'ump 45': 'ump45', 'p90': 'p90', 
        'bizon': 'bizon', 'pp-bizon': 'bizon', 'pp bizon': 'bizon', 'pp_bizon': 'bizon',
        
        // Heavy
        'nova': 'nova', 'xm1014': 'xm1014', 'xm-1014': 'xm1014', 'xm 1014': 'xm1014', 
        'mag7': 'mag7', 'mag-7': 'mag7', 'mag 7': 'mag7', 
        'sawedoff': 'sawedoff', 'sawed-off': 'sawedoff', 'sawed off': 'sawedoff',
        'm249': 'm249', 'negev': 'negev',
        
        // Pistols
        'glock': 'glock', 'glock18': 'glock', 'glock-18': 'glock', 'glock 18': 'glock',
        'usp_s': 'usp_silencer', 'usp-s': 'usp_silencer', 'usp_silencer': 'usp_silencer', 'usp s': 'usp_silencer',
        'hkp2000': 'hkp2000', 'p2000': 'hkp2000', 'p250': 'p250', 
        'tec9': 'tec9', 'tec-9': 'tec9', 'tec 9': 'tec9',
        'fiveseven': 'fiveseven', 'five-seven': 'fiveseven', 'five seven': 'fiveseven', 'five_seven': 'fiveseven',
        'cz75a': 'cz75a', 'cz75-auto': 'cz75a', 'cz75 auto': 'cz75a', 'cz75_auto': 'cz75a',
        'deagle': 'deagle', 'desert_eagle': 'deagle', 'desert-eagle': 'deagle', 'desert eagle': 'deagle', 
        'revolver': 'revolver', 'r8': 'revolver', 'r8-revolver': 'revolver', 'r8 revolver': 'revolver',
        'elite': 'elite', 'dualies': 'elite', 'duals': 'elite', 'dual-berettas': 'elite', 'dual berettas': 'elite',
        
        // Utility & Others
        'hegrenade': 'hegrenade', 'he grenade': 'hegrenade', 'he-grenade': 'hegrenade', 'he granede': 'hegrenade',
        'flashbang': 'flashbang', 'flash-bang': 'flashbang', 'flash': 'flashbang',
        'smokegrenade': 'smokegrenade', 'smoke': 'smokegrenade', 'smoke-grenade': 'smokegrenade',
        'molotov': 'molotov', 'incgrenade': 'incgrenade', 'incendiary grenade': 'incgrenade', 'incendiary': 'incgrenade', 'incendiary granede': 'incgrenade',
        'inferno': 'inferno', 'decoy': 'decoy', 'decoygrenade': 'decoy', 'decoy-grenade': 'decoy',
        'c4': 'planted_c4', 'planted_c4': 'planted_c4', 'taser': 'taser', 'zeus': 'taser', 'zeus27': 'taser',
        'flashbang_assist': 'flashbang_assist',
        
        // Knives
        'bayonet': 'bayonet', 'knife': 'knife', 'knifegg': 'knifegg', 'knife_t': 'knife_t',
        'knife_butterfly': 'knife_butterfly', 'knife_karambit': 'knife_karambit', 
        'knife_m9_bayonet': 'knife_m9_bayonet', 'knife_flip': 'knife_flip', 'knife_gut': 'knife_gut', 
        'knife_falchion': 'knife_falchion', 'knife_tactical': 'knife_tactical', 
        'knife_survival_bowie': 'knife_survival_bowie', 'knife_stiletto': 'knife_stiletto', 
        'knife_ursus': 'knife_ursus', 'knife_widowmaker': 'knife_widowmaker', 'knife_canis': 'knife_canis',
        'knife_cord': 'knife_cord', 'knife_outdoor': 'knife_outdoor', 'knife_skeleton': 'knife_skeleton',
        'knife_kukri': 'knife_kukri', 'knife_bowie': 'knife_bowie', 'knife_css': 'knife_css',
        'knife_gypsy_jackknife': 'knife_gypsy_jackknife', 'knife_push': 'knife_push',
        'knife_twinblade': 'knife_twinblade',
    };

    const finalName = MAPPING[cleanName] || cleanName;
    return `https://raw.githubusercontent.com/ChetdeJong/cs2-killfeed-generator/master/public/weapons/${finalName}.svg`;
};

const ConfrontosTimeline: React.FC<{ timeline: any, players: any[], damageTimeline?: any, detailedDamageTimeline?: any }> = ({ timeline, players, damageTimeline, detailedDamageTimeline }) => {
    if (!timeline) return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600 bg-black/20 rounded-[40px] border border-dashed border-white/[0.03]">
            <Crosshair size={48} strokeWidth={1} className="mb-4 text-rose-500/20" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Dados de confrontos indisponíveis</h4>
            <p className="text-[10px] uppercase text-zinc-700 mt-2 font-bold tracking-widest">Requer análise profunda da demo</p>
        </div>
    );

    const rounds = Object.keys(timeline).map(Number).sort((a, b) => a - b);
    const getPlayer = (sid: string) => players.find(p => String(p.steam64_id) === String(sid) || String(p.steamid64) === String(sid));

    // Summary Calculations
    const killerStats: Record<string, number> = {};
    const victimStats: Record<string, number> = {};
    Object.values(timeline).flat().forEach((k: any) => {
        killerStats[k.attackerSteamId] = (killerStats[k.attackerSteamId] || 0) + 1;
        victimStats[k.victimSteamId] = (victimStats[k.victimSteamId] || 0) + 1;
    });

    const topKillers = Object.entries(killerStats).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topVictims = Object.entries(victimStats).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // --- Cálculo da Matriz de Duelos (Head-to-Head) ---
    const duelMatrix: Record<string, Record<string, number>> = {};
    Object.values(timeline).flat().forEach((k: any) => {
        const attacker = String(k.attackerSteamId);
        const victim = String(k.victimSteamId);
        if (!duelMatrix[attacker]) duelMatrix[attacker] = {};
        duelMatrix[attacker][victim] = (duelMatrix[attacker][victim] || 0) + 1;
    });

    const team1 = players.filter(p => String(p.team_id) === '3' || String(p.team_id).toUpperCase() === 'CT' || String(p.team_id).toUpperCase() === 'A');
    const team2 = players.filter(p => String(p.team_id) === '2' || String(p.team_id).toUpperCase() === 'T' || String(p.team_id).toUpperCase() === 'B');
    
    // Identificar qual time é o do usuário (para colocar nas linhas)
    const userInTeam2 = team2.some(p => p.is_user);
    const rowsTeam = userInTeam2 ? team2 : team1;
    const colsTeam = userInTeam2 ? team1 : team2;

    const getDuelScore = (attackerSid: string, victimSid: string) => {
        const kills = duelMatrix[attackerSid]?.[victimSid] || 0;
        const deaths = duelMatrix[victimSid]?.[attackerSid] || 0;
        return { kills, deaths };
    };
    // ------------------------------------------------
    const scrollToRound = (r: number) => {
        const el = document.getElementById(`confrontos-round-${r}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="relative flex items-start gap-8 pb-10">
            {/* Premium Round Quick Nav */}
            <div className="hidden xl:flex flex-col gap-2 sticky top-4 self-start bg-zinc-900/60 p-3 rounded-[32px] border border-white/10 backdrop-blur-xl z-20 max-h-[70vh] overflow-y-auto scrollbar-none shadow-2xl">
                <button 
                    onClick={(e) => (e.currentTarget.closest('.overflow-y-auto') as any)?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-yellow-500 hover:text-black transition-all mb-2"
                    title="Voltar ao início"
                >
                    <ChevronUp size={18} strokeWidth={3} />
                </button>
                <div className="h-px w-6 bg-white/10 mx-auto mb-2" />
                <span className="text-[8px] font-black text-zinc-500 uppercase text-center mb-1 tracking-widest">Rounds</span>
                {rounds.map(rNum => (
                    <button
                        key={rNum}
                        onClick={() => scrollToRound(rNum)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all ${
                            Number(rNum) === 0 
                            ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black' 
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-yellow-500/50 hover:bg-yellow-500/10'
                        }`}
                    >
                        {Number(rNum) === 0 ? 'F' : rNum}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex flex-col gap-12 min-w-0">
                
                {/* MATRIZ DE DUELOS (HEAD-TO-HEAD) */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><Swords size={120} /></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500 mb-8 flex items-center gap-3">
                        <Swords size={18} /> Matriz de Confrontos Diretos (K/D Individual)
                    </h3>
                    
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full border-separate border-spacing-2">
                            <thead>
                                <tr>
                                    <th className="w-32"></th>
                                    {colsTeam.map(p => (
                                        <th key={p.steam64_id || p.steamid64} className="p-2">
                                            <div className="flex flex-col items-center gap-2">
                                                <img src={p.avatar} className="w-8 h-8 rounded-lg border border-white/10" alt="" />
                                                <span className="text-[8px] font-black uppercase text-zinc-500 truncate max-w-[60px]">{p.name || p.nickname}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rowsTeam.map(rp => (
                                    <tr key={rp.steam64_id || rp.steamid64}>
                                        <td className="p-2">
                                            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                                <img src={rp.avatar} className="w-8 h-8 rounded-lg border border-white/10" alt="" />
                                                <span className="text-[10px] font-black text-white truncate max-w-[80px]">{rp.name || rp.nickname}</span>
                                            </div>
                                        </td>
                                        {colsTeam.map(cp => {
                                            const { kills, deaths } = getDuelScore(rp.steam64_id || rp.steamid64, cp.steam64_id || cp.steamid64);
                                            const isAdvantage = kills > deaths;
                                            const isDisadvantage = deaths > kills;
                                            const hasFought = kills > 0 || deaths > 0;

                                            return (
                                                <td key={cp.steam64_id || cp.steamid64} className="p-1">
                                                    <div className={`h-12 rounded-xl flex flex-col items-center justify-center border transition-all ${
                                                        !hasFought ? 'bg-zinc-950/20 border-white/[0.02] opacity-30' :
                                                        isAdvantage ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]' :
                                                        isDisadvantage ? 'bg-red-500/10 border-red-500/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]' :
                                                        'bg-zinc-800/40 border-white/10'
                                                    }`}>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className={`text-sm font-black italic ${!hasFought ? 'text-zinc-700' : isAdvantage ? 'text-emerald-400' : isDisadvantage ? 'text-red-400' : 'text-white'}`}>
                                                                {kills}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-zinc-600">-</span>
                                                            <span className={`text-[11px] font-bold ${!hasFought ? 'text-zinc-800' : 'text-zinc-500'}`}>
                                                                {deaths}
                                                            </span>
                                                        </div>
                                                        {hasFought && (
                                                            <div className="w-8 h-0.5 bg-black/40 rounded-full mt-1 overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${isAdvantage ? 'bg-emerald-500' : isDisadvantage ? 'bg-red-500' : 'bg-zinc-500'}`} 
                                                                    style={{ width: `${(kills / (kills + deaths)) * 100}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Premium Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-transparent border border-emerald-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Trophy size={200} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6 flex items-center gap-2">
                        <Trophy size={16} /> Elite de Combate: Carrascos
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {topKillers.map(([sid, count]) => {
                            const p = getPlayer(sid);
                            return (
                                <div key={sid} className="flex items-center gap-4 bg-zinc-950/60 p-3 rounded-[24px] border border-white/5 hover:border-emerald-500/30 transition-all">
                                    <img src={p?.avatar} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black italic text-zinc-300 truncate">{p?.name || p?.nickname}</span>
                                        <span className="text-[10px] font-black text-emerald-500 tracking-widest">{count} KILLS</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500/10 via-zinc-900/40 to-transparent border border-rose-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Skull size={200} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 mb-6 flex items-center gap-2">
                        <Skull size={16} /> Alvos Frequentes: Maiores Vítimas
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {topVictims.map(([sid, count]) => {
                            const p = getPlayer(sid);
                            return (
                                <div key={sid} className="flex items-center gap-4 bg-zinc-950/60 p-3 rounded-[24px] border border-white/5 hover:border-rose-500/30 transition-all">
                                    <img src={p?.avatar} className="w-10 h-10 rounded-xl border border-white/10 grayscale opacity-60" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black italic text-zinc-300 truncate">{p?.name || p?.nickname}</span>
                                        <span className="text-[10px] font-black text-rose-500 tracking-widest">{count} MORTES</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Premium Battle Log */}
            <div className="space-y-16">
                {rounds.map(rNum => (
                    <div key={rNum} id={`confrontos-round-${rNum}`} className="space-y-8 scroll-mt-32">
                        <div className="flex items-center gap-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-white/10" />
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">SEQUENCE LOG</span>
                                <div className="px-10 py-3 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-4 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] text-white italic">{Number(rNum) === 0 ? 'ROUND FACA' : `ROUND ${rNum}`}</span>
                                </div>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/5 to-white/10" />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-5 px-4 lg:px-20">
                            {timeline[rNum].map((k: any, idx: number) => {
                                const attacker = getPlayer(k.attackerSteamId);
                                const victim = getPlayer(k.victimSteamId);
                                
                                return (
                                    <motion.div 
                                        key={idx} 
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        className="bg-zinc-900/40 border border-white/[0.04] rounded-[24px] p-4 flex items-center justify-between hover:bg-zinc-900/60 hover:border-white/10 hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        {/* Attacker */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="relative group-hover:scale-105 transition-transform duration-500">
                                                <img src={attacker?.avatar} className="w-10 h-10 rounded-[16px] border border-white/10 group-hover:border-yellow-500/40 shadow-lg" alt="" />
                                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0c0f15] ${attacker?.team_id === '2' ? 'bg-orange-500' : 'bg-sky-500'}`} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-sm font-black italic truncate tracking-tight ${attacker?.team_id === '2' ? 'text-orange-400' : 'text-sky-400'}`}>{attacker?.name || attacker?.nickname || 'Desconhecido'}</span>
                                                {k.attackerHp > 0 && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                            <Heart size={8} className="text-emerald-500" fill="currentColor" />
                                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{k.attackerHp} HP</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                            <div className="flex flex-col items-center gap-3 px-6 border-x border-white/[0.05] min-w-[200px]">
                                                <div className="flex items-center gap-4">
                                                    <img 
                                                        src={weaponImg(k.weapon)} 
                                                        className="h-5 brightness-0 invert opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
                                                        alt={k.weapon} 
                                                        title={k.weapon}
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://raw.githubusercontent.com/ChetdeJong/cs2-killfeed-generator/master/public/weapons/knife.svg';
                                                            e.currentTarget.onerror = null;
                                                        }}
                                                    />
                                                    {k.isHeadshot && (
                                                        <div className="w-9 h-9 rounded-[14px] bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-[inset_0_0_10px_rgba(244,63,94,0.1)] group-hover:scale-110 transition-transform">
                                                            <Target size={18} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-emerald-400 tracking-tighter italic">{k.damage}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">HP DMG</span>
                                                    </div>
                                                    <div className="h-1 w-20 bg-black/40 rounded-full overflow-hidden shadow-inner">
                                                        <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} className="h-full bg-emerald-500/80 rounded-full" />
                                                    </div>
                                                    <div className="text-[8px] text-zinc-500 font-bold italic text-center max-w-[160px] truncate leading-tight">
                                                        {attacker?.name || attacker?.nickname || 'Desconhecido'} de <span className="text-zinc-300 uppercase">{k.weapon}</span> em {victim?.name || victim?.nickname || 'Desconhecido'}
                                                    </div>
                                                </div>
                                            </div>

                                        {/* Victim */}
                                        <div className="flex items-center gap-4 flex-1 justify-end min-w-0">
                                            <div className="flex flex-col items-end text-right min-w-0">
                                                <span className={`text-sm font-black italic truncate tracking-tight opacity-50 group-hover:opacity-70 transition-all ${victim?.team_id === '2' ? 'text-orange-400' : 'text-sky-400'}`}>{victim?.name || victim?.nickname || 'Desconhecido'}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex -space-x-1.5 mr-2">
                                                        {detailedDamageTimeline && detailedDamageTimeline[rNum] && detailedDamageTimeline[rNum][victim?.steam64_id || victim?.steamid64] && 
                                                            Object.entries(detailedDamageTimeline[rNum][victim?.steam64_id || victim?.steamid64])
                                                                .filter(([sid]) => sid !== String(attacker?.steam64_id || attacker?.steamid64))
                                                                .map(([sid, dmg]: [string, any]) => {
                                                                    const contributor = getPlayer(sid);
                                                                    if (!contributor) return null;
                                                                    return (
                                                                        <img 
                                                                            key={sid}
                                                                            src={contributor.avatar} 
                                                                            className="w-5 h-5 rounded-full border border-zinc-900 shadow-lg object-cover" 
                                                                            title={`${contributor.name}: ${dmg} DMG`}
                                                                            alt=""
                                                                        />
                                                                    );
                                                                })
                                                        }
                                                    </div>
                                                    <span className="text-[8px] font-black text-rose-500/60 uppercase tracking-widest italic">NEUTRALIZADO</span>
                                                    <Skull size={10} className="text-rose-500/60" />
                                                </div>
                                            </div>
                                            <div className="relative grayscale group-hover:grayscale-0 transition-all duration-500 opacity-50 group-hover:opacity-90">
                                                <img src={victim?.avatar} className="w-10 h-10 rounded-[16px] border border-white/10 group-hover:border-rose-500/40 shadow-lg" alt="" />
                                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0c0f15] ${victim?.team_id === '2' ? 'bg-orange-500' : 'bg-sky-500'}`} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            
                            {damageTimeline && damageTimeline[rNum] && (
                                <div className="mt-6 pt-5 border-t border-white/[0.03] flex flex-wrap gap-3 justify-center items-center">
                                    <span className="w-full text-center text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-1">Dano Infligido na Rodada</span>
                                    {Object.entries(damageTimeline[rNum])
                                        .sort((a: any, b: any) => b[1] - a[1])
                                        .map(([sid, dmg]: [string, any]) => {
                                            const p = getPlayer(sid);
                                            if (!p || dmg === 0) return null;
                                            return (
                                                <div key={sid} className="flex items-center gap-2 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm hover:scale-105 transition-transform">
                                                    <img src={p.avatar} className="w-5 h-5 rounded-md border border-white/10" alt="" />
                                                    <span className="text-[10px] font-black text-zinc-400 italic">{p.nickname || p.name}</span>
                                                    <span className="text-[10px] font-black text-emerald-500">{dmg}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
};

const ArsenalLog: React.FC<{ weaponStats: any[], players: any[], match: any }> = ({ weaponStats, players, match }) => {
    const scrollToPlayer = (sid: string) => {
        const el = document.getElementById(`arsenal-player-${sid}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="relative flex items-start gap-8 pb-10">
            {/* Floating Quick Nav */}
            <div className="hidden xl:flex flex-col gap-3 sticky top-4 self-start bg-zinc-900/60 p-3 rounded-[32px] border border-white/10 backdrop-blur-xl z-20 shadow-2xl">
                <button 
                    onClick={(e) => (e.currentTarget.closest('.overflow-y-auto') as any)?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-12 h-12 rounded-[18px] flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-yellow-500 hover:text-black transition-all mb-1"
                    title="Voltar ao início"
                >
                    <ChevronUp size={20} strokeWidth={3} />
                </button>
                <div className="flex flex-col items-center gap-1 mb-2">
                    <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Início</span>
                    <div className="h-px w-6 bg-white/10" />
                </div>
                {players.map(p => (
                    <button
                        key={p.steam64_id || p.steamid64}
                        onClick={() => scrollToPlayer(p.steam64_id || p.steamid64)}
                        className="w-12 h-12 rounded-[18px] overflow-hidden border-2 border-transparent hover:border-yellow-500 hover:scale-110 transition-all group relative shadow-lg"
                        title={p.name || p.nickname}
                    >
                        <img src={p.avatar} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${p.team_id === '3' ? 'bg-sky-500' : 'bg-orange-500'}`} />
                    </button>
                ))}
            </div>

            <div className="flex-1 flex flex-col gap-12 min-w-0">
            {/* Survival & Utility Premium Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-yellow-500/10 via-zinc-900/40 to-transparent border border-yellow-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Clock size={200} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400 mb-8 flex items-center gap-2">
                        <Clock size={16} /> Biometria: Ciclo de Vida e Sobrevivência
                    </h4>
                    <div className="space-y-4 max-h-[440px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                        {players.sort((a,b) => (b.avg_ttd || 0) - (a.avg_ttd || 0)).map(p => (
                            <div key={p.steam64_id || p.steamid64} className="flex items-center justify-between group p-4 bg-zinc-950/60 rounded-[28px] border border-white/5 hover:border-yellow-500/30 transition-all duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="relative group-hover:scale-105 transition-transform shrink-0">
                                        <img src={p.avatar} className="w-12 h-12 rounded-[18px] border-2 border-white/10 shadow-2xl object-cover shrink-0" alt="" />
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0c0f15] ${p.team_id === '2' ? 'bg-orange-500' : 'bg-sky-500'} shadow-lg`} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-base font-black italic text-zinc-200 group-hover:text-white transition-colors truncate max-w-[140px]">{p.name || p.nickname}</span>
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] truncate">{p.team_id === '2' ? 'TERRORIST' : 'COUNTER-TERRORIST'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-end">
                                        <span className="text-2xl font-black text-white italic tracking-tighter">{p.avg_ttd ? `${Math.round(p.avg_ttd)}s` : '—'}</span>
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Média/Round</span>
                                    </div>
                                    <div className="flex flex-col items-end min-w-[100px]">
                                        <span className="text-2xl font-black text-yellow-500 italic tracking-tighter">
                                            {p.avg_ttd ? `${Math.round(p.avg_ttd * ((match?.metadata?.team_2_score || 0) + (match?.metadata?.team_3_score || 0)))}s` : '—'}
                                        </span>
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vida Total</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-transparent border border-emerald-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Zap size={200} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-8 flex items-center gap-2">
                        <Zap size={16} /> Logística: Consumo de Utilitários
                    </h4>
                    <div className="grid grid-cols-1 gap-4 max-h-[440px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                        {players.sort((a,b) => ((a.he_thrown || 0) + (a.flash_thrown || 0) + (a.smokes_thrown || 0) + (a.molotovs_thrown || 0)) - ((b.he_thrown || 0) + (b.flash_thrown || 0) + (b.smokes_thrown || 0) + (b.molotovs_thrown || 0))).reverse().map(p => (
                            <div key={p.steam64_id || p.steamid64} className="flex items-center justify-between p-5 bg-zinc-950/60 rounded-[32px] border border-white/5 hover:border-emerald-500/30 hover:bg-zinc-950/80 transition-all duration-500">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <img src={p.avatar} className="w-10 h-10 rounded-2xl border border-white/10 object-cover shrink-0" alt="" />
                                    <span className="text-sm font-black italic text-zinc-300 truncate max-w-[120px]">{p.name || p.nickname}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <UtilityBadge count={p.he_thrown} label="HE" color="red" icon={<Bomb size={12} />} />
                                    <UtilityBadge count={p.flash_thrown} label="FB" color="yellow" icon={<Zap size={12} />} />
                                    <UtilityBadge count={p.smokes_thrown} label="SM" color="sky" icon={<Cloud size={12} />} />
                                    <UtilityBadge count={p.molotovs_thrown} label="MO" color="orange" icon={<Flame size={12} />} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Premium Weapons Table */}
            <div className="flex flex-col gap-10">
                {players.map(p => {
                    const pStats = weaponStats.filter((ws: any) => String(ws.player_id) === String(p.steam64_id || p.steamid64));
                    const totalRounds = (match?.metadata?.team_2_score || 0) + (match?.metadata?.team_3_score || 0) || 24;
                    
                    // Totals calculation
                    const totalKills = p.kills || pStats.reduce((acc: number, curr: any) => acc + (curr.kills || 0), 0);
                    const totalDmg = pStats.reduce((acc: number, curr: any) => acc + (curr.damage || 0), 0);
                    const totalHs = pStats.reduce((acc: number, curr: any) => acc + (curr.headshots || 0), 0);
                    const hsPercent = totalKills > 0 ? Math.round((totalHs / totalKills) * 100) : 0;
                    const adr = (totalDmg / totalRounds).toFixed(1);

                    return (
                        <div key={p.steam64_id || p.steamid64} id={`arsenal-player-${p.steam64_id || p.steamid64}`} className="bg-zinc-900/40 border border-white/[0.04] rounded-[48px] p-8 hover:bg-zinc-900/60 transition-all duration-500 shadow-2xl relative group overflow-hidden scroll-mt-32">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            
                            {/* Player Header & Total Summary */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 border-b border-white/[0.05] pb-10">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <img src={p.avatar} className="w-16 h-16 rounded-[24px] border-2 border-white/10 group-hover:border-yellow-500/30 transition-all duration-500 shadow-2xl" alt="" />
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-zinc-950 ${p.team_id === '3' ? 'bg-sky-500' : 'bg-orange-500'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black italic text-white tracking-tighter uppercase">{p.name || p.nickname}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${p.team_id === '3' ? 'text-sky-400' : 'text-orange-400'}`}>
                                            {p.team_id === '3' ? 'Counter-Terrorist Specialist' : 'Terrorist Operative'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-12 gap-y-6">
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-black italic text-yellow-500 tracking-tighter drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">{totalKills}</span>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Kills</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-black italic text-emerald-400 tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">{totalDmg}</span>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Damage</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-black italic text-sky-400 tracking-tighter drop-shadow-[0_0_10px_rgba(56,189,248,0.2)]">{adr}</span>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ADR</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black italic text-rose-400 tracking-tighter drop-shadow-[0_0_10px_rgba(251,113,133,0.2)]">{hsPercent}%</span>
                                            <span className="text-xs font-black italic text-rose-400/40">({totalHs})</span>
                                        </div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Headshot Efficiency</span>
                                    </div>
                                </div>
                            </div>

                            {/* Weapons Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {pStats.length === 0 ? (
                                    <div className="col-span-full py-10 flex flex-col items-center justify-center bg-black/20 rounded-[32px] border border-dashed border-white/5 opacity-40">
                                        <Target className="text-zinc-700 mb-2" size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 italic">Nenhum abate registrado com armamento</span>
                                    </div>
                                ) : (
                                    pStats.sort((a:any, b:any) => b.kills - a.kills).map((ws: any, i: number) => {
                                        const hsPercentW = ws.kills > 0 ? Math.round((ws.headshots / ws.kills) * 100) : 0;
                                        const weaponAdr = (ws.damage / totalRounds).toFixed(1);

                                        return (
                                            <div key={i} className="flex flex-col gap-4 p-6 bg-zinc-950/60 border border-white/5 rounded-[32px] hover:border-white/10 hover:bg-zinc-950 transition-all duration-300 relative group/weapon">
                                                <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 mb-2">
                                                    <img 
                                                        src={weaponImg(ws.weapon_name)} 
                                                        className="h-6 brightness-0 invert opacity-40 group-hover/weapon:opacity-100 transition-all drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover/weapon:scale-110" 
                                                        alt={ws.weapon_name}
                                                        title={ws.weapon_name}
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://raw.githubusercontent.com/ChetdeJong/cs2-killfeed-generator/master/public/weapons/knife.svg';
                                                            e.currentTarget.onerror = null;
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[18px] font-black text-white italic tracking-tighter leading-none">{ws.kills}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">K</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-emerald-400 italic leading-none">{ws.damage}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter mt-1">DMG</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[13px] font-black text-sky-400 italic leading-none">{weaponAdr}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter mt-1">ADR</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-rose-400 italic leading-none">{hsPercentW}%</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter mt-1">HS%</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[13px] font-black text-zinc-400 italic leading-none">{ws.headshots}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter mt-1">HS</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );
}; // End ArsenalLog

const UtilityBadge: React.FC<{ count: number, label: string, color: string, icon?: React.ReactNode }> = ({ count, label, color, icon }) => {
    const colorClasses: any = {
        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
        yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
        sky:    'bg-sky-500/10 border-sky-500/20 text-sky-300',
        red:    'bg-red-500/10 border-red-500/20 text-red-400'
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className={`w-10 h-10 rounded-[14px] flex flex-col items-center justify-center border ${colorClasses[color]} shadow-inner group-hover:scale-110 transition-transform`}>
                {icon && <div className="opacity-40">{icon}</div>}
                <span className="text-xs font-black italic leading-none mt-0.5">{count || 0}</span>
            </div>
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        </div>
    );
};

export default TropaPremiumMatchReportModal;
