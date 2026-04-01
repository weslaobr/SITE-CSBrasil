"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, X, Shuffle, ArrowRight, ArrowLeft, Search, User as UserIcon, Medal, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
    steamId: string;
    nickname: string;
    avatar: string;
    rating: number;
    gcLevel?: number;
    faceitLevel?: number;
    isGuest?: boolean;
    assignment: "unassigned" | "A" | "B";
}

// Subcomponents
function PlayerCard({ player, pos, onRemove, onMoveUnassigned, onMoveRight, onMoveLeft, side }: { player: Player, pos: number, onRemove: ()=>void, onMoveUnassigned: ()=>void, onMoveRight?: ()=>void, onMoveLeft?: ()=>void, side: "left"|"right" }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout
            className={`group relative flex items-center bg-zinc-950/80 p-3 rounded-xl border border-white/5 shadow-md ${side === "left" ? "pr-10" : "pl-10"}`}>
            
            {side === "left" ? (
                <>
                    <img src={player.avatar} className="w-8 h-8 rounded-md border border-white/10 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0 ml-3">
                        <p className="font-bold text-xs text-white truncate group-hover:text-purple-400 transition-colors">{player.nickname} {player.isGuest && <span className="ml-1 text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase tracking-tighter">Guest</span>}</p>
                        <p className="text-[10px] font-mono text-zinc-400 font-bold mt-0.5">{player.rating} SR</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-col flex-1 min-w-0 mr-3 text-right">
                        <p className="font-bold text-xs text-white truncate group-hover:text-purple-400 transition-colors">{player.isGuest && <span className="mr-1 text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase tracking-tighter">Guest</span>} {player.nickname}</p>
                        <p className="text-[10px] font-mono text-zinc-400 font-bold mt-0.5">{player.rating} SR</p>
                    </div>
                    <img src={player.avatar} className="w-8 h-8 rounded-md border border-white/10 shrink-0" />
                </>
            )}

            <div className={`absolute ${side === "left" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all`}>
                <button onClick={onRemove} className="p-1.5 bg-zinc-900 border border-white/10 rounded-md text-zinc-500 hover:text-red-500 hover:border-red-500/30 mx-auto shadow-lg" title="Remover dos selecionados">
                    <X size={14} />
                </button>
                <div className="flex bg-zinc-900 border border-white/10 rounded-md overflow-hidden shadow-lg" title="Mover">
                    {onMoveLeft && (
                        <button onClick={onMoveLeft} className="p-2 text-zinc-400 hover:bg-blue-500 hover:text-white border-r border-white/5 transition-colors">
                            <ArrowLeft size={14} />
                        </button>
                    )}
                    <button onClick={onMoveUnassigned} className="p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors" title="Mover para Reserva">
                        <Users size={14} />
                    </button>
                    {onMoveRight && (
                        <button onClick={onMoveRight} className="p-2 text-zinc-400 hover:bg-yellow-500 hover:text-black border-l border-white/5 transition-colors">
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function EmptySlot({ team, onClick }: { team: string, onClick: ()=>void }) {
    return (
        <div onClick={onClick} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-all justify-center sm:justify-start">
            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center text-zinc-600 shrink-0">
                <UserIcon size={14} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Espaço Vazio</p>
        </div>
    );
}

export default function TeamBuilderPage() {
    const [dbPlayers, setDbPlayers] = useState<Player[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [guestName, setGuestName] = useState("");
    const [guestRating, setGuestRating] = useState("");
    const [showGuestForm, setShowGuestForm] = useState(false);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await fetch("/api/ranking");
                const data = await res.json();
                if (Array.isArray(data)) {
                    const formatted = data.map(p => ({
                        ...p,
                        assignment: "unassigned" as const
                    }));
                    setDbPlayers(formatted);
                }
            } catch (error) {
                console.error("Failed to fetch players:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, []);

    const handleSelectPlayer = (player: Player) => {
        if (selectedPlayers.length >= 10) {
            alert("Você já selecionou o limite máximo de 10 jogadores.");
            return;
        }
        setSelectedPlayers([...selectedPlayers, { ...player, assignment: "unassigned" }]);
    };

    const handleRemovePlayer = (steamId: string) => {
        setSelectedPlayers(selectedPlayers.filter(p => p.steamId !== steamId));
    };

    const handleAddGuest = () => {
        if (!guestName.trim()) return;
        if (selectedPlayers.length >= 10) {
            alert("Limite máximo de 10 jogadores atingido.");
            return;
        }
        const ratingNum = parseInt(guestRating) || 5000;
        
        const newGuest: Player = {
            steamId: `guest_${Date.now()}`,
            nickname: guestName,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + guestName,
            rating: ratingNum,
            isGuest: true,
            assignment: "unassigned"
        };

        setSelectedPlayers([...selectedPlayers, newGuest]);
        setGuestName("");
        setGuestRating("");
        setShowGuestForm(false);
    };

    const handleAssign = (steamId: string, team: "unassigned" | "A" | "B") => {
        const teamCount = selectedPlayers.filter(p => p.assignment === team).length;
        if (team !== "unassigned" && teamCount >= 5) {
            alert(`O Time ${team} já atingiu o limite de 5 jogadores.`);
            return;
        }

        setSelectedPlayers(prev => prev.map(p => 
            p.steamId === steamId ? { ...p, assignment: team } : p
        ));
    };

    const handleResetTeams = () => {
        setSelectedPlayers(prev => prev.map(p => ({ ...p, assignment: "unassigned" })));
    };

    const handleAutoBalance = () => {
        if (selectedPlayers.length !== 10) {
            alert("Selecione exatamente 10 jogadores para balancear os times automaticamente.");
            return;
        }

        const sorted = [...selectedPlayers].sort((a, b) => b.rating - a.rating);
        let tA = 0;
        let tB = 0;
        let cA = 0;
        let cB = 0;

        const newAssignments = sorted.map(p => {
            if (cA === 5) {
                cB++; tB += p.rating; return { ...p, assignment: "B" as const };
            }
            if (cB === 5) {
                cA++; tA += p.rating; return { ...p, assignment: "A" as const };
            }
            if (tA <= tB) {
                cA++; tA += p.rating; return { ...p, assignment: "A" as const };
            } else {
                cB++; tB += p.rating; return { ...p, assignment: "B" as const };
            }
        });

        setSelectedPlayers(newAssignments);
    };

    const unassigned = selectedPlayers.filter(p => p.assignment === "unassigned");
    const teamA = selectedPlayers.filter(p => p.assignment === "A");
    const teamB = selectedPlayers.filter(p => p.assignment === "B");

    const avgA = teamA.length > 0 ? Math.round(teamA.reduce((acc, p) => acc + p.rating, 0) / teamA.length) : 0;
    const avgB = teamB.length > 0 ? Math.round(teamB.reduce((acc, p) => acc + p.rating, 0) / teamB.length) : 0;

    const availableDbPlayers = dbPlayers.filter(dbP => !selectedPlayers.some(sp => sp.steamId === dbP.steamId));
    const filteredDbPool = availableDbPlayers.filter(p => p.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 md:p-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Users size={22} />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Sorteador de Times</h1>
                    </div>
                    <p className="text-zinc-500 text-sm pl-[52px]">Selecione 10 jogadores e deixe o sistema organizar o Mix mais equilibrado.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Lado Esquerdo: Base de Dados & Convidados */}
                <div className="lg:w-1/3 flex flex-col space-y-6">
                    <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4 backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                                <Search size={14} className="text-purple-500" /> Plantel de Jogadores
                            </h2>
                            <button 
                                onClick={() => setShowGuestForm(!showGuestForm)}
                                className={`p-2 rounded-lg transition-all border ${showGuestForm ? 'bg-purple-500 text-black border-purple-500' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                title="Adicionar Convidado"
                            >
                                <UserPlus size={14} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {showGuestForm && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-black/30 p-4 rounded-xl border border-purple-500/20 space-y-3 mb-4">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Adicionar Convidado</p>
                                        <input 
                                            type="text" 
                                            placeholder="Nome / Apelido"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none transition-all"
                                        />
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Rating (ex: 15000)"
                                                value={guestRating}
                                                onChange={(e) => setGuestRating(e.target.value)}
                                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none transition-all"
                                            />
                                            <button 
                                                onClick={handleAddGuest}
                                                className="bg-purple-500 hover:bg-purple-400 text-black px-4 py-2 rounded-lg font-black text-xs uppercase"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Buscar jogador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50"
                            />
                        </div>

                        <div className="h-[calc(100vh-280px)] min-h-[450px] pb-6 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 animate-pulse bg-white/5 rounded-xl" />
                                ))
                            ) : filteredDbPool.length === 0 ? (
                                <p className="text-zinc-600 text-xs text-center py-10 font-bold uppercase tracking-widest">Nenhum jogador encontrado.</p>
                            ) : (
                                filteredDbPool.map(p => (
                                    <div key={p.steamId} onClick={() => handleSelectPlayer(p)} 
                                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl cursor-pointer transition-all group">
                                        <img src={p.avatar} alt={p.nickname} className="w-10 h-10 rounded-md border border-white/10" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate group-hover:text-purple-400 transition-colors">{p.nickname}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] bg-black/50 text-yellow-500 px-1.5 py-0.5 rounded font-mono font-bold">{p.rating} SR</span>
                                                {(p.gcLevel ?? 0) > 0 && <span className="text-[10px] bg-black/50 text-zinc-400 px-1.5 py-0.5 rounded font-bold">Lvl {p.gcLevel}</span>}
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-purple-500 group-hover:text-black transition-all">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Arena de Montagem */}
                <div className="lg:w-2/3 flex flex-col space-y-6">
                    
                    {/* Status Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-zinc-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-xl gap-4">
                        <div className="flex items-center gap-5 shrink-0">
                            {/* SVG Circular Progress */}
                            <div className="relative flex items-center justify-center w-16 h-16">
                                <svg className="absolute inset-0 -rotate-90 w-full h-full drop-shadow-lg" viewBox="0 0 36 36">
                                    <path
                                        className="text-black/50"
                                        strokeWidth="3"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={`${selectedPlayers.length === 10 ? 'text-green-500' : 'text-purple-500'} transition-all duration-500`}
                                        strokeWidth="3"
                                        strokeDasharray={`${(selectedPlayers.length / 10) * 100}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                
                                <div className="absolute inset-0 flex items-center justify-center mt-0.5">
                                    <span className={`text-xl font-black ${selectedPlayers.length === 10 ? 'text-green-400' : 'text-white'}`}>
                                        {selectedPlayers.length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">
                                    Plantel
                                </span>
                                <span className="text-sm text-white font-black uppercase tracking-wider leading-none">
                                    Selecionados
                                </span>
                                <span className={`text-[10px] font-mono mt-1 ${selectedPlayers.length === 10 ? 'text-green-500/80 font-bold' : 'text-zinc-600'}`}>
                                    {selectedPlayers.length === 10 ? 'Lobby Completo' : `${10 - selectedPlayers.length} vaga(s) restante(s)`}
                                </span>
                            </div>
                        </div>

                        {unassigned.length > 0 && (
                            <div className="flex flex-1 items-center justify-start xl:justify-center overflow-x-auto gap-3 py-3 px-4 border border-dashed border-white/10 rounded-xl bg-black/20 scrollbar-thin scrollbar-thumb-white/10 mx-0 lg:mx-4">
                                {unassigned.map(p => (
                                    <div key={p.steamId} className="group relative hover:z-50 shrink-0 flex items-center bg-zinc-950 border border-white/5 p-2 pr-6 rounded-2xl hover:border-purple-500/50 transition-all shadow-md">
                                        <img src={p.avatar} title={p.nickname} className="w-10 h-10 rounded-full border border-white/10 shadow-sm shrink-0 group-hover:opacity-20 transition-all" />
                                        <div className="flex flex-col ml-3 group-hover:opacity-20 transition-all">
                                            <p className="font-bold text-sm text-white max-w-[120px] truncate">{p.nickname}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs font-mono font-bold text-yellow-500/90">{p.rating} <span className="text-zinc-500 text-[10px]">SR</span></p>
                                                {(p.gcLevel ?? 0) > 0 && <span className="text-[10px] bg-black/40 text-purple-400 font-bold px-1.5 py-0.5 rounded border border-purple-500/20">Lvl {p.gcLevel}</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="absolute inset-0 flex items-stretch justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all z-50 bg-black/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
                                            <button onClick={() => handleAssign(p.steamId, "A")} className="flex-1 bg-yellow-500/90 text-black hover:bg-yellow-400 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase transition-colors" title="Para Time A"><ArrowLeft size={16} /> Time A</button>
                                            <button onClick={() => handleRemovePlayer(p.steamId)} className="px-4 bg-red-500/90 text-white hover:bg-red-400 border-x border-red-600/50 transition-colors flex items-center justify-center" title="Remover"><X size={16} /></button>
                                            <button onClick={() => handleAssign(p.steamId, "B")} className="flex-1 bg-blue-500/90 text-white hover:bg-blue-400 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase transition-colors" title="Para Time B">Time B <ArrowRight size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                            <button 
                                onClick={handleResetTeams}
                                disabled={selectedPlayers.every(p => p.assignment === "unassigned")}
                                className={`flex items-center justify-center p-4 rounded-xl font-black transition-all shrink-0 border ${!selectedPlayers.every(p => p.assignment === "unassigned") ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-white/10 hover:border-white/30 active:scale-95 shadow-md' : 'bg-white/5 text-zinc-700 border-white/5 cursor-not-allowed'}`}
                                title="Voltar times para o Saguão"
                            >
                                <Users size={16} />
                            </button>
                            <button 
                                onClick={handleAutoBalance}
                                disabled={selectedPlayers.length !== 10}
                                className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black uppercase text-xs transition-all shadow-lg shrink-0 ${selectedPlayers.length === 10 ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95 border border-purple-400/50' : 'bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5'}`}
                            >
                                <Shuffle size={16} /> Auto-Balance
                            </button>
                        </div>
                    </div>

                    {/* Veto Arena / Time A vs Time B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                        {/* VS Badge */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-950 border-4 border-zinc-900 rounded-full flex items-center justify-center font-black italic text-zinc-500 z-10 select-none shadow-xl">
                            VS
                        </div>

                        {/* TEAM A */}
                        <div className="bg-zinc-900/60 rounded-3xl border border-yellow-500/20 overflow-hidden ring-1 ring-inset ring-transparent hover:ring-yellow-500/30 transition-all h-full">
                            <div className="bg-gradient-to-br from-yellow-500/20 to-transparent p-6 border-b border-yellow-500/10">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-md">Time A</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Medal size={14} className="text-zinc-400" />
                                    <p className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-widest">Média SR: <span className="text-white text-sm">{avgA}</span></p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamA.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} pos={idx+1} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveRight={() => handleAssign(p.steamId, "B")} side="left" />
                                ))}
                                {Array.from({ length: 5 - teamA.length }).map((_, i) => (
                                    <EmptySlot key={`empty-a-${i}`} team="A" onClick={() => {
                                        const unp = unassigned[0];
                                        if (unp) handleAssign(unp.steamId, "A");
                                    }}/>
                                ))}
                            </div>
                        </div>

                        {/* TEAM B */}
                        <div className="bg-zinc-900/60 rounded-3xl border border-blue-500/20 overflow-hidden ring-1 ring-inset ring-transparent hover:ring-blue-500/30 transition-all h-full">
                            <div className="bg-gradient-to-bl from-blue-500/20 to-transparent p-6 border-b border-blue-500/10 flex flex-col items-end text-right">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500 drop-shadow-md">Time B</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-widest"><span className="text-white text-sm">{avgB}</span> :Média SR</p>
                                    <Medal size={14} className="text-zinc-400" />
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamB.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} pos={idx+1} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveLeft={() => handleAssign(p.steamId, "A")} side="right" />
                                ))}
                                {Array.from({ length: 5 - teamB.length }).map((_, i) => (
                                    <EmptySlot key={`empty-b-${i}`} team="B" onClick={() => {
                                        const unp = unassigned[0];
                                        if (unp) handleAssign(unp.steamId, "B");
                                    }}/>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
