"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, X, Shuffle, ArrowRight, ArrowLeft, Search, User as UserIcon, Medal, Plus, Map as MapIcon, History, Trophy, RotateCcw, Copy, Check, ClipboardList, Send, Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
    steamId: string;
    nickname: string;
    avatar: string;
    rating: number;
    resenhaRating?: number;
    tempRating?: number;
    tempResenhaRating?: number;
    gcLevel?: number;
    faceitLevel?: number;
    isGuest?: boolean;
    assignment: "unassigned" | "A" | "B";
}

const FALLBACK_MAP_POOL = [
    { id: "dust2", name: "Dust2", image: "/img/maps/Dust2.webp" },
    { id: "mirage", name: "Mirage", image: "/img/maps/Mirage.webp" },
    { id: "inferno", name: "Inferno", image: "/img/maps/Inferno.webp" },
    { id: "nuke", name: "Nuke", image: "/img/maps/Nuke.webp" },
    { id: "vertigo", name: "Vertigo", image: "/img/maps/Vertigo.webp" },
    { id: "ancient", name: "Ancient", image: "/img/maps/Ancient.webp" },
    { id: "anubis", name: "Anubis", image: "/img/maps/Anubis.webp" },
    { id: "overpass", name: "Overpass", image: "/img/maps/Overpass.webp" },
    { id: "cache", name: "Cache", image: "/img/maps/Cache.png" },
    { id: "train", name: "Train", image: "/img/maps/Train.webp" },
    { id: "cobblestone", name: "Cobblestone", image: "/img/maps/Cobblestone.png" },
];

// Subcomponents
function PlayerCard({ player, pos, onRemove, onMoveUnassigned, onMoveRight, onMoveLeft, side, balanceMode, onEditRating }: { player: Player, pos: number, onRemove: ()=>void, onMoveUnassigned: ()=>void, onMoveRight?: ()=>void, onMoveLeft?: ()=>void, side: "left"|"right", balanceMode: "standard"|"resenha", onEditRating: (field: "sr"|"resenha", value: number)=>void }) {
    const [editingField, setEditingField] = React.useState<"sr"|"resenha"|null>(null);
    const [editVal, setEditVal] = React.useState("");

    const srVal = player.tempRating !== undefined ? player.tempRating : player.rating;
    const resenhaVal = player.tempResenhaRating !== undefined ? player.tempResenhaRating : (player.resenhaRating || 5);
    const displayRating = balanceMode === "resenha" ? `${resenhaVal.toFixed(1)} ★` : `${srVal} SR`;
    const isOverridden = balanceMode === "resenha" ? player.tempResenhaRating !== undefined : player.tempRating !== undefined;

    const startEdit = () => {
        const field = balanceMode === "resenha" ? "resenha" : "sr";
        setEditingField(field);
        setEditVal(field === "sr" ? String(srVal) : resenhaVal.toFixed(1));
    };

    const commitEdit = () => {
        if (editingField) {
            const num = parseFloat(editVal);
            if (!isNaN(num) && num > 0) onEditRating(editingField, num);
        }
        setEditingField(null);
    };
    
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout
            className={`group relative flex items-center bg-zinc-950/80 p-3 rounded-xl border border-white/5 shadow-md ${side === "left" ? "pr-10" : "pl-10"}`}>
            
            {side === "left" ? (
                <>
                    <img src={player.avatar} className="w-8 h-8 rounded-md border border-white/10 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0 ml-3">
                        <p className="font-bold text-xs text-white truncate group-hover:text-purple-400 transition-colors">{player.nickname} {player.isGuest && <span className="ml-1 text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase tracking-tighter">Guest</span>}</p>
                        {editingField ? (
                            <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                                onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingField(null); }}
                                className="w-20 bg-zinc-800 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none mt-0.5" />
                        ) : (
                            <button onClick={startEdit} className={`flex items-center gap-1 text-[10px] font-mono font-bold mt-0.5 w-fit hover:text-purple-400 transition-colors ${isOverridden ? "text-purple-400" : "text-zinc-400"}`} title="Editar pontuação temporária">
                                {displayRating}{isOverridden && <Pencil size={8} />}
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-col flex-1 min-w-0 mr-3 text-right items-end">
                        <p className="font-bold text-xs text-white truncate group-hover:text-purple-400 transition-colors">{player.isGuest && <span className="mr-1 text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase tracking-tighter">Guest</span>} {player.nickname}</p>
                        {editingField ? (
                            <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                                onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingField(null); }}
                                className="w-20 bg-zinc-800 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none mt-0.5 text-right" />
                        ) : (
                            <button onClick={startEdit} className={`flex items-center gap-1 text-[10px] font-mono font-bold mt-0.5 w-fit hover:text-purple-400 transition-colors ${isOverridden ? "text-purple-400" : "text-zinc-400"}`} title="Editar pontuação temporária">
                                {isOverridden && <Pencil size={8} />}{displayRating}
                            </button>
                        )}
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
    const [copiedTeam, setCopiedTeam] = useState<"A" | "B" | "both" | null>(null);
    const [discordStatus, setDiscordStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [editingUnassigned, setEditingUnassigned] = useState<{ steamId: string, field: "sr"|"resenha", value: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapPool, setMapPool] = useState<{id: string, name: string, image: string, active?: boolean}[]>(FALLBACK_MAP_POOL);

    const [guestName, setGuestName] = useState("");
    const [guestRating, setGuestRating] = useState("");
    const [showGuestForm, setShowGuestForm] = useState(false);

    const [balanceMode, setBalanceMode] = useState<"standard" | "resenha">("standard");

    // Map Veto State
    const [vetoMaps, setVetoMaps] = useState<Record<string, { type: "ban" | "pick", team: "A" | "B" | "system" }>>({});
    const [vetoTurn, setVetoTurn] = useState<"A" | "B">("A");
    const [vetoHistory, setVetoHistory] = useState<{ type: "ban" | "pick", map: string, team: "A" | "B" | "system" }[]>([]);

    useEffect(() => {
        const fetchResenhaRanking = async () => {
            try {
                const res = await fetch("/api/resenha/ranking");
                const data = await res.json();
                return data;
            } catch (error) {
                console.error("Failed to fetch resenha ranking:", error);
                return [];
            }
        };

        const fetchAll = async () => {
            setLoading(true);
            const [playersRes, resenhaRes] = await Promise.all([
                fetch("/api/ranking"),
                fetchResenhaRanking()
            ]);

            const playersData = await playersRes.json();
            const playersList = playersData.players || playersData;
            
            if (Array.isArray(playersList)) {
                const formatted = playersList.map(p => {
                    const resenhaInfo = resenhaRes.find((r: any) => r.steamId === p.steamId);
                    return {
                        ...p,
                        resenhaRating: resenhaInfo?.avgOverall || 5, // Default to 5 if no rating
                        assignment: "unassigned" as const
                    };
                });
                setDbPlayers(formatted);
            }
            setLoading(false);
        };

        const fetchMaps = async () => {
            try {
                const res = await fetch("/api/admin/maps");
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setMapPool(data.filter(m => m.active !== false));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch maps:", err);
            }
        };

        fetchAll();
        fetchMaps();
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
            resenhaRating: 5, // Default for guests
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

    const handleCopyTeam = (team: "A" | "B" | "both") => {
        let text = "";
        if (team === "both") {
            const listA = teamA.map(p => p.nickname).join("\n");
            const listB = teamB.map(p => p.nickname).join("\n");
            text = `Time A:\n${listA || "(vazio)"}\n\nTime B:\n${listB || "(vazio)"}`;
        } else if (team === "A") {
            text = teamA.map(p => p.nickname).join("\n");
        } else {
            text = teamB.map(p => p.nickname).join("\n");
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopiedTeam(team);
            setTimeout(() => setCopiedTeam(null), 2000);
        });
    };

    const handleSendDiscord = async () => {
        if (teamA.length === 0 && teamB.length === 0) return;
        setDiscordStatus("sending");
        try {
            const res = await fetch("/api/discord/team-announce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamA, teamB, avgA, avgB, balanceMode }),
            });
            if (res.ok) {
                setDiscordStatus("sent");
                setTimeout(() => setDiscordStatus("idle"), 3000);
            } else {
                const data = await res.json();
                console.error("Discord error:", data);
                setDiscordStatus("error");
                setTimeout(() => setDiscordStatus("idle"), 4000);
            }
        } catch (err) {
            console.error(err);
            setDiscordStatus("error");
            setTimeout(() => setDiscordStatus("idle"), 4000);
        }
    };

    const handleAutoBalance = () => {
        if (selectedPlayers.length !== 10) {
            alert("Selecione exatamente 10 jogadores para balancear os times automaticamente.");
            return;
        }

        const getRating = (p: Player) => balanceMode === "resenha" ? (p.resenhaRating || 5) : p.rating;

        const sorted = [...selectedPlayers].sort((a, b) => getRating(b) - getRating(a));
        let tA = 0;
        let tB = 0;
        let cA = 0;
        let cB = 0;

        const newAssignments = sorted.map(p => {
            const pRating = getRating(p);
            if (cA === 5) {
                cB++; tB += pRating; return { ...p, assignment: "B" as const };
            }
            if (cB === 5) {
                cA++; tA += pRating; return { ...p, assignment: "A" as const };
            }
            if (tA <= tB) {
                cA++; tA += pRating; return { ...p, assignment: "A" as const };
            } else {
                cB++; tB += pRating; return { ...p, assignment: "B" as const };
            }
        });

        setSelectedPlayers(newAssignments);
    };

    const handleMapAction = (mapId: string, type: "ban" | "pick", isRandom = false) => {
        if (vetoMaps[mapId]) return;

        const team = isRandom ? "system" : vetoTurn;
        const newAction = { type, map: mapId, team };

        setVetoMaps(prev => ({ ...prev, [mapId]: { type, team } }));
        setVetoHistory(prev => [...prev, newAction]);

        if (!isRandom) {
            setVetoTurn(prev => prev === "A" ? "B" : "A");
        }
    };

    const handleRandomMap = () => {
        const available = mapPool.filter(m => !vetoMaps[m.id]);
        if (available.length === 0) return;
        
        const random = available[Math.floor(Math.random() * available.length)];
        handleMapAction(random.id, "pick", true);
    };

    const resetVeto = () => {
        setVetoMaps({});
        setVetoTurn("A");
        setVetoHistory([]);
    };

    const unassigned = selectedPlayers.filter(p => p.assignment === "unassigned");
    const teamA = selectedPlayers.filter(p => p.assignment === "A");
    const teamB = selectedPlayers.filter(p => p.assignment === "B");

    const getPlayerRating = (p: Player) => balanceMode === "resenha"
        ? (p.tempResenhaRating !== undefined ? p.tempResenhaRating : (p.resenhaRating || 5))
        : (p.tempRating !== undefined ? p.tempRating : p.rating);

    const avgA = teamA.length > 0 ? (balanceMode === "resenha"
        ? Math.round((teamA.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamA.length) * 10) / 10
        : Math.round(teamA.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamA.length)) : 0;

    const avgB = teamB.length > 0 ? (balanceMode === "resenha"
        ? Math.round((teamB.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamB.length) * 10) / 10
        : Math.round(teamB.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamB.length)) : 0;

    const handleTempRating = (steamId: string, field: "sr" | "resenha", value: number) => {
        setSelectedPlayers(prev => prev.map(p => p.steamId === steamId
            ? { ...p, ...(field === "sr" ? { tempRating: value } : { tempResenhaRating: value }) }
            : p
        ));
    };

    const availableDbPlayers = dbPlayers.filter(dbP => !selectedPlayers.some(sp => sp.steamId === dbP.steamId));
    const filteredDbPool = availableDbPlayers.filter(p => p.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 md:p-8 space-y-8 pb-32">
            {/* ── HERO HEADER ── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner">
                            <Users className="text-purple-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Sorteador de</span>
                                <span className="text-purple-400"> Times</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-purple-500/40" />
                                Auto-Balance
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                <span className="text-zinc-500">Selecione 10 jogadores para o mix mais equilibrado</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

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
                                                <span className={`text-[10px] bg-black/50 ${balanceMode === 'standard' ? 'text-yellow-500' : 'text-zinc-500'} px-1.5 py-0.5 rounded font-mono font-bold`}>{p.rating} SR</span>
                                                <span className={`text-[10px] bg-black/50 ${balanceMode === 'resenha' ? 'text-purple-400' : 'text-zinc-500'} px-1.5 py-0.5 rounded font-mono font-bold`}>{(p.resenhaRating || 5).toFixed(1)} ★</span>
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

                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex bg-zinc-800 p-1 rounded-xl border border-white/5 mr-2">
                                        <button 
                                            onClick={() => setBalanceMode("standard")}
                                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${balanceMode === "standard" ? "bg-purple-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                                        >
                                            Standard
                                        </button>
                                        <button 
                                            onClick={() => setBalanceMode("resenha")}
                                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${balanceMode === "resenha" ? "bg-purple-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                                        >
                                            Resenha
                                        </button>
                                    </div>

                                    <button 
                                        onClick={handleResetTeams}
                                disabled={selectedPlayers.every(p => p.assignment === "unassigned")}
                                className={`flex items-center justify-center p-4 rounded-xl font-black transition-all shrink-0 border ${!selectedPlayers.every(p => p.assignment === "unassigned") ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-white/10 hover:border-white/30 active:scale-95 shadow-md' : 'bg-white/5 text-zinc-700 border-white/5 cursor-not-allowed'}`}
                                title="Voltar times para o Saguão"
                            >
                                <Users size={16} />
                            </button>
                            <button 
                                onClick={() => handleCopyTeam("both")}
                                disabled={teamA.length === 0 && teamB.length === 0}
                                className={`flex items-center gap-2 px-4 py-4 rounded-xl font-black uppercase text-xs transition-all shadow-lg shrink-0 border ${
                                    copiedTeam === "both"
                                        ? 'bg-green-600 text-white border-green-500/50 shadow-green-500/20'
                                        : (teamA.length > 0 || teamB.length > 0)
                                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-white/10 hover:border-white/30 active:scale-95'
                                            : 'bg-white/5 text-zinc-600 cursor-not-allowed border-white/5'
                                }`}
                                title="Copiar nomes dos dois times"
                            >
                                {copiedTeam === "both" ? <Check size={16} /> : <ClipboardList size={16} />}
                                <span className="hidden sm:inline">{copiedTeam === "both" ? "Copiado!" : "Copiar"}</span>
                            </button>
                            <button 
                                onClick={handleAutoBalance}
                                disabled={selectedPlayers.length !== 10}
                                className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black uppercase text-xs transition-all shadow-lg shrink-0 ${selectedPlayers.length === 10 ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95 border border-purple-400/50' : 'bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5'}`}
                            >
                                <Shuffle size={16} /> Auto-Balance
                            </button>
                            <button
                                onClick={handleSendDiscord}
                                disabled={discordStatus === "sending" || (teamA.length === 0 && teamB.length === 0)}
                                className={`flex items-center gap-2 px-4 py-4 rounded-xl font-black uppercase text-xs transition-all shadow-lg shrink-0 border ${
                                    discordStatus === "sent"
                                        ? 'bg-green-600 text-white border-green-500/50 shadow-green-500/20'
                                        : discordStatus === "error"
                                            ? 'bg-red-700 text-white border-red-500/50'
                                            : discordStatus === "sending"
                                                ? 'bg-indigo-700 text-white border-indigo-500/50 cursor-wait'
                                                : (teamA.length > 0 || teamB.length > 0)
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/50 active:scale-95'
                                                    : 'bg-white/5 text-zinc-600 cursor-not-allowed border-white/5'
                                }`}
                                title="Enviar times para o Discord"
                            >
                                {discordStatus === "sending" && <Loader2 size={16} className="animate-spin" />}
                                {discordStatus === "sent" && <Check size={16} />}
                                {discordStatus === "error" && <X size={16} />}
                                {discordStatus === "idle" && <Send size={16} />}
                                <span className="hidden sm:inline">
                                    {discordStatus === "sending" ? "Enviando..." : discordStatus === "sent" ? "Enviado!" : discordStatus === "error" ? "Erro" : "Discord"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Unassigned Grid */}
                    {unassigned.length > 0 && (
                        <div className="bg-zinc-900/20 p-5 rounded-2xl border border-dashed border-white/5 backdrop-blur-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Users size={14} className="text-zinc-600"/>
                                Jogadores no Saguão
                                <span className="ml-auto bg-black/40 px-2 py-1 rounded text-zinc-400">{unassigned.length} aguardando alocação</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                                {unassigned.map(p => (
                                    <div key={p.steamId} className="group relative hover:z-50 flex items-center bg-zinc-950 border border-white/5 p-2 pr-4 rounded-2xl hover:border-purple-500/50 transition-all shadow-md">
                                        <img src={p.avatar} title={p.nickname} className="w-10 h-10 rounded-full border border-white/10 shadow-sm shrink-0 group-hover:opacity-20 transition-all" />
                                        <div className="flex flex-col ml-3 group-hover:opacity-20 transition-all min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{p.nickname}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {editingUnassigned?.steamId === p.steamId && editingUnassigned.field === "sr" ? (
                                                    <input autoFocus type="number" value={editingUnassigned.value}
                                                        onChange={e => setEditingUnassigned({ ...editingUnassigned, value: e.target.value })}
                                                        onBlur={() => { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "sr", n); setEditingUnassigned(null); }}
                                                        onKeyDown={e => { if (e.key === "Enter") { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "sr", n); setEditingUnassigned(null); } if (e.key === "Escape") setEditingUnassigned(null); }}
                                                        className="w-20 bg-zinc-800 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none" />
                                                ) : (
                                                    <button onClick={e => { e.stopPropagation(); setEditingUnassigned({ steamId: p.steamId, field: "sr", value: String(p.tempRating ?? p.rating) }); }} className={`text-[10px] font-mono font-bold hover:text-yellow-400 transition-colors flex items-center gap-0.5 ${p.tempRating !== undefined ? 'text-purple-400' : balanceMode === 'standard' ? 'text-yellow-500' : 'text-zinc-500'}`} title="Editar SR">
                                                        {p.tempRating ?? p.rating} SR{p.tempRating !== undefined && <Pencil size={7} />}
                                                    </button>
                                                )}
                                                {editingUnassigned?.steamId === p.steamId && editingUnassigned.field === "resenha" ? (
                                                    <input autoFocus type="number" step="0.1" value={editingUnassigned.value}
                                                        onChange={e => setEditingUnassigned({ ...editingUnassigned, value: e.target.value })}
                                                        onBlur={() => { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "resenha", n); setEditingUnassigned(null); }}
                                                        onKeyDown={e => { if (e.key === "Enter") { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "resenha", n); setEditingUnassigned(null); } if (e.key === "Escape") setEditingUnassigned(null); }}
                                                        className="w-16 bg-zinc-800 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none" />
                                                ) : (
                                                    <button onClick={e => { e.stopPropagation(); setEditingUnassigned({ steamId: p.steamId, field: "resenha", value: (p.tempResenhaRating ?? p.resenhaRating ?? 5).toFixed(1) }); }} className={`text-[10px] font-mono font-bold hover:text-purple-300 transition-colors flex items-center gap-0.5 ${p.tempResenhaRating !== undefined ? 'text-purple-400' : balanceMode === 'resenha' ? 'text-purple-400' : 'text-zinc-500'}`} title="Editar Resenha">
                                                        {(p.tempResenhaRating ?? p.resenhaRating ?? 5).toFixed(1)} ★{p.tempResenhaRating !== undefined && <Pencil size={7} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="absolute inset-0 flex items-stretch justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all z-50 bg-zinc-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
                                            <button onClick={() => handleAssign(p.steamId, "A")} className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase transition-colors" title="Para Time A"><ArrowLeft size={16} /> A</button>
                                            <button onClick={() => handleRemovePlayer(p.steamId)} className="px-5 bg-red-500 text-white hover:bg-red-400 border-x border-red-600/50 transition-colors flex items-center justify-center" title="Remover"><X size={16} /></button>
                                            <button onClick={() => handleAssign(p.steamId, "B")} className="flex-1 bg-blue-500 text-white hover:bg-blue-400 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase transition-colors" title="Para Time B">B <ArrowRight size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Veto Arena / Time A vs Time B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                        {/* VS Badge */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-950 border-4 border-zinc-900 rounded-full flex items-center justify-center font-black italic text-zinc-500 z-10 select-none shadow-xl">
                            VS
                        </div>

                        {/* TEAM A */}
                        <div className="bg-zinc-900/60 rounded-3xl border border-yellow-500/20 overflow-hidden ring-1 ring-inset ring-transparent hover:ring-yellow-500/30 transition-all h-full">
                            <div className="bg-gradient-to-br from-yellow-500/20 to-transparent p-6 border-b border-yellow-500/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-md">Time A</h3>
                                    <button
                                        onClick={() => handleCopyTeam("A")}
                                        disabled={teamA.length === 0}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                            copiedTeam === "A"
                                                ? 'bg-green-600/20 text-green-400 border-green-500/30'
                                                : teamA.length > 0
                                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 active:scale-95'
                                                    : 'bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed'
                                        }`}
                                        title="Copiar nomes do Time A"
                                    >
                                        {copiedTeam === "A" ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedTeam === "A" ? "Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Medal size={14} className="text-zinc-400" />
                                    <p className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
                                        Média {balanceMode === "resenha" ? "Resenha" : "SR"}: <span className="text-white text-sm">{avgA}{balanceMode === "resenha" ? " ★" : ""}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamA.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} pos={idx+1} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveRight={() => handleAssign(p.steamId, "B")} side="left" balanceMode={balanceMode} onEditRating={(field, val) => handleTempRating(p.steamId, field, val)} />
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
                            <div className="bg-gradient-to-bl from-blue-500/20 to-transparent p-6 border-b border-blue-500/10">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => handleCopyTeam("B")}
                                        disabled={teamB.length === 0}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                            copiedTeam === "B"
                                                ? 'bg-green-600/20 text-green-400 border-green-500/30'
                                                : teamB.length > 0
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 active:scale-95'
                                                    : 'bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed'
                                        }`}
                                        title="Copiar nomes do Time B"
                                    >
                                        {copiedTeam === "B" ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedTeam === "B" ? "Copiado" : "Copiar"}
                                    </button>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500 drop-shadow-md">Time B</h3>
                                </div>
                                <div className="flex items-center gap-2 mt-2 justify-end text-right">
                                    <p className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-widest"><span className="text-white text-sm">{avgB}{balanceMode === "resenha" ? " ★" : ""}</span> :{balanceMode === "resenha" ? "Resenha" : "SR"} Média</p>
                                    <Medal size={14} className="text-zinc-400" />
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamB.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} pos={idx+1} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveLeft={() => handleAssign(p.steamId, "A")} side="right" balanceMode={balanceMode} onEditRating={(field, val) => handleTempRating(p.steamId, field, val)} />
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


            {/* ── MAP VETO SECTION ── */}
            <div className="mt-20 space-y-8 bg-zinc-900/20 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                <MapIcon className="text-yellow-500 w-6 h-6" />
                            </div>
                            Veto de Mapas
                        </h2>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                            <span className="w-8 h-px bg-yellow-500/30" />
                            Selecione os mapas ou use o sorteador aleatório
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={resetVeto}
                            className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-500 hover:text-white hover:border-white/30 transition-all active:scale-95 shadow-lg"
                            title="Resetar Veto"
                        >
                            <RotateCcw size={20} />
                        </button>
                        <button 
                            onClick={handleRandomMap}
                            className="flex items-center gap-3 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs rounded-2xl transition-all shadow-xl active:scale-95 border border-yellow-300/30 shadow-yellow-500/10"
                        >
                            <Shuffle size={18} /> Mapa Aleatório
                        </button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-10">
                    {/* Map Grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {mapPool.map((map) => {
                            const state = vetoMaps[map.id];
                            const isBanned = state?.type === "ban";
                            const isPicked = state?.type === "pick";
                            
                            return (
                                <motion.div 
                                    key={map.id}
                                    layout
                                    className={`relative aspect-[16/10] rounded-3xl overflow-hidden border-2 transition-all group ${
                                        isBanned ? 'border-red-500/50 opacity-40 grayscale' :
                                        isPicked ? 'border-green-500 shadow-2xl shadow-green-500/20' :
                                        'border-white/5 hover:border-yellow-500/50'
                                    }`}
                                >
                                    <img src={map.image} alt={map.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                                    
                                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
                                                {map.name}
                                            </span>
                                            {state && (
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-2xl ${
                                                    state.type === "pick" ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                                                }`}>
                                                    {state.type === "pick" ? "Selecionado" : "Banido"}
                                                </span>
                                            )}
                                        </div>

                                        {!state && (
                                            <div className="flex gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                <button 
                                                    onClick={() => handleMapAction(map.id, "pick")}
                                                    className="flex-1 bg-green-500 hover:bg-green-400 text-black py-3 rounded-xl font-black text-xs uppercase shadow-xl shadow-green-900/40 transition-colors"
                                                >
                                                    Pick
                                                </button>
                                                <button 
                                                    onClick={() => handleMapAction(map.id, "ban")}
                                                    className="flex-1 bg-red-500 hover:bg-red-400 text-white py-3 rounded-xl font-black text-xs uppercase shadow-xl shadow-red-900/40 transition-colors"
                                                >
                                                    Ban
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isBanned && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-red-500 text-5xl font-black border-8 border-red-500 px-6 py-2 rounded-2xl rotate-[-15deg] shadow-2xl bg-black/40 backdrop-blur-sm">
                                                BAN
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Veto Sidebar / History */}
                    <div className="xl:w-96 space-y-4">
                        <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5 backdrop-blur-3xl h-full flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <History size={16} className="text-yellow-500" /> Log de Veto
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Turno:</span>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${vetoTurn === "A" ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`}>
                                        TIME {vetoTurn}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 min-h-[400px]">
                                {vetoHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10 py-20">
                                        <MapIcon size={64} className="mb-4" />
                                        <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhuma ação registrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {vetoHistory.map((entry, i) => (
                                            <motion.div 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={i} 
                                                className="flex items-center gap-4 p-4 bg-zinc-900/80 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                                                    entry.type === "pick" ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                }`}>
                                                    {entry.type === "pick" ? <Trophy size={20} /> : <X size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between mb-0.5">
                                                        <p className="font-black text-base uppercase text-white truncate drop-shadow-md">
                                                            {mapPool.find(m => m.id === entry.map)?.name}
                                                        </p>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                            entry.team === "A" ? 'bg-yellow-500/20 text-yellow-500' : 
                                                            entry.team === "B" ? 'bg-blue-500/20 text-blue-500' : 
                                                            'bg-zinc-800 text-zinc-500'
                                                        }`}>
                                                            {entry.team === "system" ? "Random" : `Time ${entry.team}`}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${entry.type === "pick" ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {entry.type === "pick" ? "Selecionado para a partida" : "Banido da partida"}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
