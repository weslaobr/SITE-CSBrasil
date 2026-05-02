"use client";

import React, { useState, useEffect } from 'react';
import { 
    Search, RefreshCw, Loader2, Trash2, 
    Edit2, Calendar, Map as MapIcon, Users,
    Trophy, ChevronRight, Save, X, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MatchReportModal from '../dashboard/match-report-modal';

interface MatchPlayer {
    id: string;
    steamId: string;
    team: string;
    kills: number;
    deaths: number;
    assists: number;
    user?: {
        name: string;
        image: string;
        steamId: string;
    };
}

interface GlobalMatch {
    id: string;
    source: string;
    mapName: string;
    matchDate: string;
    scoreA: number;
    scoreB: number;
    players: MatchPlayer[];
    metadata?: any;
}

export default function MatchesTab() {
    const [matches, setMatches] = useState<GlobalMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [editData, setEditData] = useState({ scoreA: 0, scoreB: 0, mapName: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [platformFilter, setPlatformFilter] = useState('all');


    // Modal state
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchMatches();
    }, [platformFilter]);


    const fetchMatches = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = platformFilter === 'all' ? '/api/admin/matches' : `/api/admin/matches?source=${platformFilter}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao carregar partidas');
            const data = await res.json();
            setMatches(data.matches || []);
        } catch (err: any) {

            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (match: GlobalMatch) => {
        // Prepare match object for the modal
        const formattedMatch = {
            ...match,
            score: `${match.scoreA}-${match.scoreB}`,
            result: match.scoreA > match.scoreB ? 'Win' : (match.scoreA < match.scoreB ? 'Loss' : 'Tie'),
            gameMode: match.source
        };
        setSelectedMatch(formattedMatch);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta partida? Isso removerá as estatísticas de todos os jogadores.')) return;

        try {
            const res = await fetch(`/api/admin/matches?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir partida');
            setMatches(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleEditStart = (match: GlobalMatch) => {
        setEditingMatch(match.id);
        setEditData({
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            mapName: match.mapName
        });
    };

    const handleSave = async (id: string) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/matches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...editData })
            });
            if (!res.ok) throw new Error('Erro ao salvar alterações');
            
            setMatches(prev => prev.map(m => m.id === id ? { ...m, ...editData } : m));
            setEditingMatch(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMatches = matches.filter(match => 
        match.mapName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Carregando histórico de partidas...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Gerenciar Partidas</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Partidas processadas e exportadas para o ranking
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Buscar por mapa ou ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40 w-48 md:w-64 transition-all"
                        />
                    </div>
                    
                    <select 
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest outline-none focus:border-yellow-500/40 transition-all appearance-none cursor-pointer"
                    >
                        <option value="all" className="bg-zinc-900">Todas Plataformas</option>
                        <option value="mix" className="bg-zinc-900">Apenas MIX</option>
                        <option value="premier" className="bg-zinc-900">Premier</option>
                        <option value="faceit" className="bg-zinc-900">Faceit</option>
                        <option value="gc" className="bg-zinc-900">GamersClub</option>
                    </select>

                    <button 
                        onClick={fetchMatches}
                        className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/5 transition-all"
                    >
                        <RefreshCw size={16} />
                    </button>

                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider">
                    {error}
                </div>
            )}

            <div className="grid gap-4">
                {filteredMatches.length === 0 ? (
                    <div className="bg-zinc-900/20 border border-dashed border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
                        <Trophy className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhuma partida processada</p>
                    </div>
                ) : (
                    filteredMatches
                        .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
                        .map((match, index, array) => {
                            let showSeparator = false;
                            let gapText = "";
                            
                            if (index > 0) {
                                const prevDate = new Date(array[index - 1].matchDate).getTime();
                                const currDate = new Date(match.matchDate).getTime();
                                const diffHours = (prevDate - currDate) / (1000 * 60 * 60);
                                
                                if (diffHours > 6) {
                                    showSeparator = true;
                                    if (diffHours > 48) {
                                        gapText = `Partidas de ${Math.floor(diffHours / 24)} dias atrás`;
                                    } else if (diffHours > 24) {
                                        gapText = `Partidas do dia anterior`;
                                    } else {
                                        gapText = `Sessão Anterior (+${Math.floor(diffHours)}h atrás)`;
                                    }
                                }
                            }

                            return (
                                <React.Fragment key={match.id}>
                                    {showSeparator && (
                                        <div className="flex items-center gap-4 mt-8 mb-4">
                                            <div className="h-px bg-white/10 flex-1" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/50 px-4 py-1.5 rounded-full border border-white/5">{gapText}</span>
                                            <div className="h-px bg-white/10 flex-1" />
                                        </div>
                                    )}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/[0.07] transition-all group">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            {/* Left Side: Basic Info */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-yellow-500 transition-colors border border-white/5 shrink-0 overflow-hidden relative">
                                                    <MapIcon size={20} className="relative z-10" />
                                                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {editingMatch === match.id ? (
                                                            <input 
                                                                type="text"
                                                                value={editData.mapName}
                                                                onChange={(e) => setEditData({...editData, mapName: e.target.value})}
                                                                className="bg-zinc-900 border border-yellow-500/40 rounded px-2 py-0.5 text-xs text-white outline-none w-32"
                                                            />
                                                        ) : (
                                                            <h3 className="text-sm font-black text-white uppercase tracking-tight">{match.mapName}</h3>
                                                        )}
                                                        <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${
                                                            match.source === 'mix' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                        }`}>
                                                            {match.source}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {format(new Date(match.matchDate), "dd MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users size={10} />
                                                            {match.players.length} JOGADORES
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Center: Score */}
                                            <div className="flex items-center justify-center gap-4 py-2 px-6 bg-black/20 rounded-xl border border-white/5 self-center lg:self-auto">
                                                {editingMatch === match.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="number"
                                                            value={editData.scoreA}
                                                            onChange={(e) => setEditData({...editData, scoreA: parseInt(e.target.value)})}
                                                            className="bg-zinc-900 border border-yellow-500/40 rounded w-12 text-center py-1 text-sm font-black text-white"
                                                        />
                                                        <span className="text-zinc-700 font-black">:</span>
                                                        <input 
                                                            type="number"
                                                            value={editData.scoreB}
                                                            onChange={(e) => setEditData({...editData, scoreB: parseInt(e.target.value)})}
                                                            className="bg-zinc-900 border border-yellow-500/40 rounded w-12 text-center py-1 text-sm font-black text-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={`text-2xl font-black italic tracking-tighter ${match.scoreA > match.scoreB ? 'text-green-500' : 'text-white'}`}>
                                                            {match.scoreA}
                                                        </span>
                                                        <div className="w-1 h-4 bg-zinc-800 rounded-full rotate-12" />
                                                        <span className={`text-2xl font-black italic tracking-tighter ${match.scoreB > match.scoreA ? 'text-green-500' : 'text-white'}`}>
                                                            {match.scoreB}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Right Side: Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {editingMatch === match.id ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleSave(match.id)}
                                                            disabled={isSaving}
                                                            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-lg shadow-green-500/10"
                                                        >
                                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                            Salvar
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingMatch(null)}
                                                            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => handleViewDetails(match)}
                                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                                        >
                                                            <Eye size={14} />
                                                            Ver Detalhes
                                                        </button>
                                                        <button 
                                                            onClick={() => handleEditStart(match)}
                                                            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(match.id)}
                                                            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Player list preview (collapsed/subtle) */}
                                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                                            {match.players.slice(0, 10).map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
                                                    <img 
                                                        src={p.user?.image || "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"} 
                                                        alt="" 
                                                        className="w-4 h-4 rounded shadow-sm"
                                                    />
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight truncate max-w-[80px]">
                                                        {p.user?.name || (p.metadata as any)?.name || (p.metadata as any)?.nickname || "Jogador"}
                                                    </span>
                                                </div>
                                            ))}
                                            {match.players.length > 10 && (
                                                <span className="text-[9px] font-black text-zinc-600 flex items-center">
                                                    +{match.players.length - 10}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </React.Fragment>
                            )
                        })
                )}
            </div>

            <MatchReportModal 
                match={selectedMatch}
                matchId={selectedMatch?.id}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSync={fetchMatches}
            />
        </div>
    );
}
