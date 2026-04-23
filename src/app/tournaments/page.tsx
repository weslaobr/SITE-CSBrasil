"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Plus, Shield, Users, X, ChevronRight, Crown, Swords, Clock, Edit2, Save, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Team { id: string; name: string; playerIds: string[]; }
interface TMatch { id: string; teamAId: string; teamBId: string; winnerId: string | null; scoreA: number | null; scoreB: number | null; round: number; status: string; mapName: string | null; teamA: Team; teamB: Team; winner: Team | null; }
interface Tournament { id: string; name: string; description: string | null; format: string; status: string; createdAt: string; teams: Team[]; matches: TMatch[]; }

const STATUS_BADGES: Record<string, { label: string; color: string; dot: string }> = {
    OPEN:     { label: 'Aberto',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400 animate-pulse' },
    RUNNING:  { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       dot: 'bg-blue-400 animate-pulse'    },
    FINISHED: { label: 'Finalizado',  color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',         dot: 'bg-zinc-500'                  },
};

function TournamentCard({ t, onOpen }: { t: Tournament; onOpen: () => void }) {
    const badge = STATUS_BADGES[t.status] || STATUS_BADGES.OPEN;
    const done = t.matches.filter(m => m.status === 'DONE').length;
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            onClick={onOpen}
            className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl p-6 cursor-pointer hover:border-yellow-500/30 hover:shadow-[0_0_20px_rgba(246,203,2,0.05)] transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Trophy size={18} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-black italic uppercase tracking-tight">{t.name}</h3>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase">{t.format} • {t.teams.length} times</p>
                    </div>
                </div>
                <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${badge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} /> {badge.label}
                </span>
            </div>
            {t.description && <p className="text-xs text-zinc-600 mb-4">{t.description}</p>}
            <div className="flex items-center justify-between">
                <div className="text-[9px] text-zinc-700 font-black uppercase">
                    {done}/{t.matches.length} partidas
                </div>
                <div className="w-32 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: t.matches.length ? `${(done / t.matches.length) * 100}%` : '0%' }}
                    />
                </div>
                <ChevronRight size={14} className="text-zinc-700 group-hover:text-yellow-500 transition-colors" />
            </div>
        </motion.div>
    );
}

function BracketView({ tournament, onClose, onUpdateMatch, onRefresh }: { tournament: Tournament; onClose: () => void; onUpdateMatch: (matchId: string, winnerId: string, scoreA: number, scoreB: number) => void; onRefresh: () => void }) {
    const rounds = [...new Set(tournament.matches.map(m => m.round))].sort((a, b) => a - b);
    const [scoring, setScoring] = useState<{ matchId: string; scoreA: string; scoreB: string } | null>(null);
    const [viewMode, setViewMode] = useState<'BRACKET' | 'TEAMS'>('BRACKET');
    const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; playerIds: string } | null>(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [isSavingTeam, setIsSavingTeam] = useState(false);

    const getWins = (teamId: string) =>
        tournament.matches.filter(m => m.winnerId === teamId).length;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-3xl my-8"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
                    <div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">{tournament.name}</h2>
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                            {tournament.format} • {tournament.teams.length} Times • {STATUS_BADGES[tournament.status]?.label}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode(v => v === 'BRACKET' ? 'TEAMS' : 'BRACKET')} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                            {viewMode === 'BRACKET' ? <Users size={14} /> : <Trophy size={14} />}
                            {viewMode === 'BRACKET' ? 'Gerenciar Times' : 'Ver Chaveamento'}
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {viewMode === 'TEAMS' ? (
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Times do Torneio</h3>
                        </div>
                        <div className="grid gap-3">
                            {tournament.teams.map((team) => (
                                <div key={team.id} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    {editingTeam?.id === team.id ? (
                                        <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                                            <input 
                                                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-yellow-500/40 w-full md:w-1/3" 
                                                placeholder="Nome do Time" 
                                                value={editingTeam.name} 
                                                onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })} 
                                            />
                                            <input 
                                                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-yellow-500/40 w-full flex-1" 
                                                placeholder="Jogadores (separados por vírgula)" 
                                                value={editingTeam.playerIds} 
                                                onChange={e => setEditingTeam({ ...editingTeam, playerIds: e.target.value })} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-white">{team.name}</h4>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {team.playerIds && team.playerIds.length > 0 ? team.playerIds.join(', ') : 'Nenhum jogador adicionado'}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        {editingTeam?.id === team.id ? (
                                            <>
                                                <button 
                                                    disabled={isSavingTeam}
                                                    onClick={async () => {
                                                        setIsSavingTeam(true);
                                                        try {
                                                            const pIds = editingTeam.playerIds.split(',').map(s => s.trim()).filter(Boolean);
                                                            await fetch(`/api/tournaments/${tournament.id}/teams`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ teamId: team.id, name: editingTeam.name, playerIds: pIds })
                                                            });
                                                            setEditingTeam(null);
                                                            onRefresh();
                                                        } finally {
                                                            setIsSavingTeam(false);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Save size={14} /> Salvar
                                                </button>
                                                <button onClick={() => setEditingTeam(null)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => setEditingTeam({ id: team.id, name: team.name, playerIds: (team.playerIds || []).join(', ') })}
                                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-6 border-t border-white/[0.05]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Adicionar Novo Time</h4>
                            <div className="flex flex-col md:flex-row gap-3">
                                <input 
                                    className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-yellow-500/40 flex-1" 
                                    placeholder="Nome do Novo Time" 
                                    value={newTeamName} 
                                    onChange={e => setNewTeamName(e.target.value)} 
                                />
                                <button 
                                    disabled={!newTeamName.trim() || isSavingTeam}
                                    onClick={async () => {
                                        setIsSavingTeam(true);
                                        try {
                                            await fetch(`/api/tournaments/${tournament.id}/teams`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: newTeamName, playerIds: [] })
                                            });
                                            setNewTeamName('');
                                            onRefresh();
                                        } finally {
                                            setIsSavingTeam(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    <Plus size={14} /> Adicionar Time
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">* Adicionar um time criará novas partidas contra todos os times já existentes.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Standings */}
                <div className="p-6 border-b border-white/[0.05]">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3">Classificação</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[...tournament.teams]
                            .sort((a, b) => getWins(b.id) - getWins(a.id))
                            .map((team, i) => (
                                <div
                                    key={team.id}
                                    className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]"
                                    style={i === 0 ? { borderColor: '#f5c51840', background: '#f5c51808' } : {}}
                                >
                                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-black text-zinc-400">
                                        {i === 0 ? <Crown size={10} className="text-yellow-400" /> : i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate" style={i === 0 ? { color: '#f5c518' } : {}}>{team.name}</p>
                                        <p className="text-[8px] text-zinc-600">{getWins(team.id)}V</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Bracket */}
                <div className="p-6 space-y-6 overflow-x-auto">
                    {rounds.map(round => (
                        <div key={round}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3">Rodada {round}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {tournament.matches.filter(m => m.round === round).map(match => (
                                    <div key={match.id} className="bg-white/[0.03] rounded-2xl border border-white/[0.05] overflow-hidden">
                                        {/* Team A */}
                                        <div className={`flex items-center justify-between px-4 py-3 ${match.winnerId === match.teamAId ? 'bg-emerald-500/10' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {match.winnerId === match.teamAId && <Crown size={10} className="text-yellow-400" />}
                                                <span className="text-xs font-black truncate max-w-[100px]">{match.teamA.name}</span>
                                            </div>
                                            <span className={`text-sm font-black ${match.winnerId === match.teamAId ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                {match.scoreA ?? '—'}
                                            </span>
                                        </div>
                                        <div className="h-px bg-white/[0.04]" />
                                        {/* Team B */}
                                        <div className={`flex items-center justify-between px-4 py-3 ${match.winnerId === match.teamBId ? 'bg-emerald-500/10' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {match.winnerId === match.teamBId && <Crown size={10} className="text-yellow-400" />}
                                                <span className="text-xs font-black truncate max-w-[100px]">{match.teamB.name}</span>
                                            </div>
                                            <span className={`text-sm font-black ${match.winnerId === match.teamBId ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                {match.scoreB ?? '—'}
                                            </span>
                                        </div>
                                        {/* Action */}
                                        {match.status !== 'DONE' && (
                                            <div className="border-t border-white/[0.05] p-2">
                                                {scoring?.matchId === match.id ? (
                                                    <div className="flex gap-2 items-center">
                                                        <input type="number" placeholder="A" min={0} className="w-12 text-center bg-black/30 rounded-lg py-1 text-xs font-black border border-white/10 outline-none" value={scoring.scoreA} onChange={e => setScoring(s => s ? { ...s, scoreA: e.target.value } : null)} />
                                                        <span className="text-zinc-600 text-xs">x</span>
                                                        <input type="number" placeholder="B" min={0} className="w-12 text-center bg-black/30 rounded-lg py-1 text-xs font-black border border-white/10 outline-none" value={scoring.scoreB} onChange={e => setScoring(s => s ? { ...s, scoreB: e.target.value } : null)} />
                                                        <button
                                                            onClick={() => {
                                                                const sA = parseInt(scoring.scoreA);
                                                                const sB = parseInt(scoring.scoreB);
                                                                if (isNaN(sA) || isNaN(sB)) return;
                                                                const winner = sA > sB ? match.teamAId : match.teamBId;
                                                                onUpdateMatch(match.id, winner, sA, sB);
                                                                setScoring(null);
                                                            }}
                                                            className="flex-1 bg-yellow-500 text-black text-[9px] font-black uppercase rounded-lg py-1.5 hover:bg-yellow-400"
                                                        >
                                                            Salvar
                                                        </button>
                                                        <button onClick={() => setScoring(null)} className="text-zinc-600 hover:text-white"><X size={12} /></button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setScoring({ matchId: match.id, scoreA: '', scoreB: '' })}
                                                        className="w-full text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-yellow-400 transition-colors py-1"
                                                    >
                                                        Registrar Resultado
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {match.status === 'DONE' && match.winner && (
                                            <div className="border-t border-white/[0.05] px-4 py-2 text-center">
                                                <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">
                                                    🏆 {match.winner.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [format, setFormat] = useState('BO1');
    const [teams, setTeams] = useState([{ name: '' }, { name: '' }]);

    const addTeam = () => setTeams(t => [...t, { name: '' }]);
    const submit = () => {
        if (!name || teams.some(t => !t.name.trim())) return;
        onCreate({ name, description, format, teams: teams.map(t => ({ name: t.name, playerIds: [] })) });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black italic uppercase tracking-tighter">Novo Torneio</h2>
                    <button onClick={onClose}><X size={16} className="text-zinc-500" /></button>
                </div>
                <input className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-yellow-500/40" placeholder="Nome do torneio *" value={name} onChange={e => setName(e.target.value)} />
                <input className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-yellow-500/40" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
                <div className="flex gap-2">
                    {['BO1', 'BO3', 'BO5'].map(f => (
                        <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${format === f ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-white/[0.03] text-zinc-500 border-white/[0.07]'}`}>{f}</button>
                    ))}
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Times *</p>
                    {teams.map((t, i) => (
                        <div key={i} className="flex gap-2">
                            <input className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-yellow-500/40" placeholder={`Time ${i + 1}`} value={t.name} onChange={e => setTeams(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                            {teams.length > 2 && <button onClick={() => setTeams(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400"><X size={14} /></button>}
                        </div>
                    ))}
                    <button onClick={addTeam} className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-yellow-400 transition-colors flex items-center gap-1">
                        <Plus size={10} /> Adicionar Time
                    </button>
                </div>
                <button onClick={submit} disabled={!name || teams.some(t => !t.name.trim())} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm py-3 rounded-xl disabled:opacity-40 transition-all">
                    Criar Torneio
                </button>
            </motion.div>
        </div>
    );
}

export default function TournamentsPage() {
    const { data: session } = useSession();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Tournament | null>(null);
    const [creating, setCreating] = useState(false);

    const fetchTournaments = () => {
        fetch('/api/tournaments')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setTournaments(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTournaments(); }, []);

    const handleCreate = async (data: any) => {
        const res = await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            const t = await res.json();
            setTournaments(prev => [t, ...prev]);
            setCreating(false);
            setSelected(t);
        }
    };

    const handleUpdateMatch = async (tournamentId: string, matchId: string, winnerId: string, scoreA: number, scoreB: number) => {
        const res = await fetch(`/api/tournaments/${tournamentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, winnerId, scoreA, scoreB, status: 'DONE' }),
        });
        if (res.ok) {
            refreshSelectedTournament(tournamentId);
        }
    };

    const refreshSelectedTournament = async (tournamentId: string) => {
        fetchTournaments();
        const refreshed = await fetch(`/api/tournaments/${tournamentId}`).then(r => r.json());
        setSelected(refreshed);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Trophy className="text-yellow-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(246,203,2,0.6)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                            <span className="text-white">Torneios</span>{' '}
                            <span className="text-yellow-400">Internos</span>
                        </h1>
                        <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1">
                            Mixes e Campeonatos da Tropa
                        </p>
                    </div>
                </div>
                {session && (
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
                    >
                        <Plus size={14} /> Criar Torneio
                    </button>
                )}
            </header>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[0,1,2].map(i => <div key={i} className="h-40 bg-zinc-900/50 rounded-3xl border border-white/5 animate-pulse" />)}
                </div>
            ) : tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Trophy size={32} className="text-yellow-400/50" />
                    </div>
                    <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">Nenhum torneio criado ainda</p>
                    {session && (
                        <button onClick={() => setCreating(true)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-xs font-black uppercase">
                            <Plus size={12} /> Criar o primeiro torneio
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments.map(t => (
                        <TournamentCard key={t.id} t={t} onOpen={() => setSelected(t)} />
                    ))}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {selected && (
                    <BracketView
                        tournament={selected}
                        onClose={() => setSelected(null)}
                        onUpdateMatch={(matchId, wId, sA, sB) => handleUpdateMatch(selected.id, matchId, wId, sA, sB)}
                        onRefresh={() => refreshSelectedTournament(selected.id)}
                    />
                )}
                {creating && <CreateModal onClose={() => setCreating(false)} onCreate={handleCreate} />}
            </AnimatePresence>
        </div>
    );
}
