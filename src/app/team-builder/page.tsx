"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, X, Shuffle, ArrowRight, ArrowLeft, Search, User as UserIcon, Medal, Plus, Map as MapIcon, History, Trophy, RotateCcw, Copy, Check, ClipboardList, Send, Loader2, Pencil, Trash2, Flame, RefreshCw } from "lucide-react";
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
    faceitElo?: number;
    isGuest?: boolean;
    discordId?: string;
    steamName?: string;
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
function PlayerCard({ player, onRemove, onMoveUnassigned, onMoveRight, onMoveLeft, side, balanceMode, onEditRating }: { player: Player, onRemove: ()=>void, onMoveUnassigned: ()=>void, onMoveRight?: ()=>void, onMoveLeft?: ()=>void, side: "left"|"right", balanceMode: "standard"|"resenha"|"tropa", onEditRating: (field: "sr"|"resenha", value: number)=>void }) {
    const [editingField, setEditingField] = React.useState<"sr"|"resenha"|null>(null);
    const [editVal, setEditVal] = React.useState("");

    const srVal = player.tempRating !== undefined ? player.tempRating : player.rating;
    const resenhaVal = player.tempResenhaRating !== undefined ? player.tempResenhaRating : (player.resenhaRating || 5);
    
    const getTropaVal = () => {
        const pR = player.tempRating ?? player.rating ?? 0;
        const premierNorm = Math.min(100, pR / 300);
        const faceitNorm = (player.faceitLevel ?? 0) * 10;
        const gcNorm = ((player.gcLevel ?? 0) / 21) * 100;
        return Math.max(premierNorm, faceitNorm, gcNorm);
    };

    const displayRating = balanceMode === "resenha" ? `${resenhaVal.toFixed(1)} ★` : balanceMode === "tropa" ? `${getTropaVal().toFixed(1)} TR` : `${srVal} SR`;
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

    const getSkillBorder = () => {
        const val = getTropaVal();
        if (val > 80) return "border-purple-500/30 hover:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]";
        if (val > 55) return "border-blue-500/30 hover:border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
        return "border-white/5 hover:border-white/10";
    };
    
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout
            className={`group relative flex items-center bg-zinc-950/85 p-3 rounded-2xl border transition-all duration-300 hover:bg-zinc-900/60 ${getSkillBorder()} ${side === "left" ? "pr-12" : "pl-12"} shadow-lg backdrop-blur-md`}>
            
            {side === "left" ? (
                <>
                    <div className="relative shrink-0">
                        <img src={player.avatar} className="w-10 h-10 rounded-xl border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    
                    <div className="flex flex-col flex-1 min-w-0 ml-3.5">
                        <div className="flex items-center gap-2">
                            <p className="font-black text-xs text-white truncate group-hover:text-yellow-400 transition-colors uppercase tracking-wide">{player.nickname} {player.isGuest && <span className="ml-1 text-[8px] bg-purple-500/25 text-purple-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-purple-500/20">Guest</span>}</p>
                            {!player.isGuest && (
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-all flex-wrap">
                                    {balanceMode !== "standard" && <span className="text-[7px] font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 rounded uppercase tracking-tighter">{srVal} SR</span>}
                                    {balanceMode !== "tropa" && <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 rounded uppercase tracking-tighter">{getTropaVal().toFixed(1)} TR</span>}
                                    {balanceMode !== "resenha" && <span className="text-[7px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 rounded uppercase tracking-tighter">{resenhaVal.toFixed(1)} ★</span>}
                                    
                                    <div className="w-px h-2 bg-white/10 mx-0.5" />

                                    {!!player.faceitLevel && player.faceitLevel > 0 && <span className="text-[7px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 rounded uppercase tracking-tighter" title={`Faceit Level ${player.faceitLevel}`}>F{player.faceitLevel}</span>}
                                    {!!player.gcLevel && player.gcLevel > 0 && <span className="text-[7px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 rounded uppercase tracking-tighter" title={`GC Level ${player.gcLevel}`}>G{player.gcLevel}</span>}
                                </div>
                            )}
                        </div>
                        {editingField ? (
                            <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                                onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingField(null); }}
                                className="w-20 bg-zinc-900 border border-purple-500/60 rounded-lg px-2 py-0.5 text-[10px] font-mono text-white outline-none mt-1 shadow-inner" />
                        ) : (
                            <button onClick={startEdit} className={`flex items-center gap-1.5 text-[10px] font-mono font-bold mt-1 w-fit hover:text-yellow-400 transition-colors ${isOverridden ? "text-purple-400" : "text-zinc-400"}`} title="Editar pontuação temporária">
                                {displayRating}{isOverridden && <Pencil size={8} className="opacity-60" />}
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-col flex-1 min-w-0 mr-3.5 text-right items-end">
                        <div className="flex items-center gap-2 justify-end">
                            {!player.isGuest && (
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-all flex-wrap justify-end">
                                    {!!player.gcLevel && player.gcLevel > 0 && <span className="text-[7px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 rounded uppercase tracking-tighter" title={`GC Level ${player.gcLevel}`}>G{player.gcLevel}</span>}
                                    {!!player.faceitLevel && player.faceitLevel > 0 && <span className="text-[7px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 rounded uppercase tracking-tighter" title={`Faceit Level ${player.faceitLevel}`}>F{player.faceitLevel}</span>}
                                    
                                    <div className="w-px h-2 bg-white/10 mx-0.5" />

                                    {balanceMode !== "resenha" && <span className="text-[7px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 rounded uppercase tracking-tighter">{resenhaVal.toFixed(1)} ★</span>}
                                    {balanceMode !== "tropa" && <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 rounded uppercase tracking-tighter">{getTropaVal().toFixed(1)} TR</span>}
                                    {balanceMode !== "standard" && <span className="text-[7px] font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 rounded uppercase tracking-tighter">{srVal} SR</span>}
                                </div>
                            )}
                            <p className="font-black text-xs text-white truncate group-hover:text-blue-400 transition-colors uppercase tracking-wide">{player.isGuest && <span className="mr-1 text-[8px] bg-purple-500/25 text-purple-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-purple-500/20">Guest</span>} {player.nickname}</p>
                        </div>
                        {editingField ? (
                            <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                                onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingField(null); }}
                                className="w-20 bg-zinc-900 border border-purple-500/60 rounded-lg px-2 py-0.5 text-[10px] font-mono text-white outline-none mt-1 shadow-inner text-right" />
                        ) : (
                            <button onClick={startEdit} className={`flex items-center gap-1.5 text-[10px] font-mono font-bold mt-1 w-fit hover:text-blue-400 transition-colors ${isOverridden ? "text-purple-400" : "text-zinc-400"}`} title="Editar pontuação temporária">
                                {isOverridden && <Pencil size={8} className="opacity-60" />}{displayRating}
                            </button>
                        )}
                    </div>
                    <div className="relative shrink-0">
                        <img src={player.avatar} className="w-10 h-10 rounded-xl border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                </>
            )}

            <div className={`absolute ${side === "left" ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20`}>
                <button onClick={onRemove} className="p-1 bg-black/85 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500 hover:text-white hover:border-red-400 transition-all duration-200 shadow-md scale-90 hover:scale-100" title="Remover dos selecionados">
                    <X size={12} />
                </button>
                <div className="flex flex-col bg-black/85 border border-white/10 rounded-lg overflow-hidden shadow-md scale-90 hover:scale-100" title="Mover">
                    {onMoveLeft && (
                        <button onClick={onMoveLeft} className="p-1.5 text-zinc-400 hover:bg-blue-500 hover:text-white transition-colors">
                            <ArrowLeft size={12} />
                        </button>
                    )}
                    <button onClick={onMoveUnassigned} className="p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors" title="Mover para Reserva">
                        <Users size={12} />
                    </button>
                    {onMoveRight && (
                        <button onClick={onMoveRight} className="p-1.5 text-zinc-400 hover:bg-yellow-500 hover:text-black transition-colors">
                            <ArrowRight size={12} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function EmptySlot({ team, onClick }: { team: string, onClick: ()=>void }) {
    const isTeamA = team === "A";
    return (
        <div 
            onClick={onClick} 
            className={`flex items-center gap-3 p-3 bg-white/[0.01] border border-dashed rounded-xl cursor-pointer transition-all duration-300 justify-center sm:justify-start group ${
                isTeamA 
                    ? 'border-yellow-500/10 hover:border-yellow-500/30 hover:bg-yellow-500/[0.02] hover:shadow-[0_0_15px_rgba(234,179,8,0.05)]' 
                    : 'border-blue-500/10 hover:border-blue-500/30 hover:bg-blue-500/[0.02] hover:shadow-[0_0_15px_rgba(59,130,246,0.05)]'
            }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                isTeamA 
                    ? 'bg-yellow-500/5 text-zinc-700 group-hover:text-yellow-500 group-hover:bg-yellow-500/10' 
                    : 'bg-blue-500/5 text-zinc-700 group-hover:text-blue-400 group-hover:bg-blue-500/10'
            }`}>
                <UserIcon size={14} className="transition-transform group-hover:scale-110" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">Vaga Disponível</p>
        </div>
    );
}

export default function TeamBuilderPage() {
    const [dbPlayers, setDbPlayers] = useState<Player[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedTeam, setCopiedTeam] = useState<"A" | "B" | "both" | null>(null);
    const [discordStatus, setDiscordStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [steamStatus, setSteamStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [editingUnassigned, setEditingUnassigned] = useState<{ steamId: string, field: "sr"|"resenha", value: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncingSteamId, setSyncingSteamId] = useState<string | null>(null);
    const [mapPool, setMapPool] = useState<{id: string, name: string, image: string, active?: boolean}[]>(FALLBACK_MAP_POOL);

    const [guestName, setGuestName] = useState("");
    const [guestRating, setGuestRating] = useState("");
    const [showGuestForm, setShowGuestForm] = useState(false);

    const [balanceMode, setBalanceMode] = useState<"standard" | "resenha" | "tropa">("standard");

    const [discordOnline, setDiscordOnline] = useState<{ members: any[], channels: any[], guildName?: string, inviteUrl?: string, widgetDisabled: boolean, loading: boolean }>({
        members: [],
        channels: [],
        widgetDisabled: false,
        loading: false
    });

    const [discordOnlyVoice, setDiscordOnlyVoice] = useState(true);

    const fetchDiscordOnline = async () => {
        setDiscordOnline(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch("/api/discord/online");
            const data = await res.json();
            if (data.success) {
                setDiscordOnline({
                    members: data.members,
                    channels: data.channels || [],
                    guildName: data.guildName,
                    inviteUrl: data.instantInvite,
                    widgetDisabled: false,
                    loading: false
                });
            } else if (data.error === "widget_disabled") {
                setDiscordOnline({
                    members: [],
                    channels: [],
                    widgetDisabled: true,
                    loading: false
                });
            } else {
                setDiscordOnline(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error("Error fetching Discord online:", error);
            setDiscordOnline(prev => ({ ...prev, loading: false }));
        }
    };

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
        fetchDiscordOnline();

        const interval = setInterval(fetchDiscordOnline, 45000);
        return () => clearInterval(interval);
    }, []);

    const handleSyncPlayer = async (steamId: string) => {
        if (syncingSteamId) return;
        setSyncingSteamId(steamId);
        try {
            const res = await fetch('/api/sync/player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steamId })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh specific player data in the list
                const refreshRes = await fetch(`/api/player/${steamId}`);
                const playerData = await refreshRes.json();
                
                if (playerData && !playerData.error) {
                    setDbPlayers(prev => prev.map(p => p.steamId === steamId ? {
                        ...p,
                        rating: playerData.playerStats?.premierRating || 0,
                        gcLevel: playerData.playerStats?.gcLevel || 0,
                        faceitLevel: playerData.playerStats?.faceitLevel || 0,
                        hasSync: !!playerData.dbUser?.steamMatchAuthCode && !!playerData.dbUser?.steamLatestMatchCode
                    } : p));
                    alert(`Sincronizado! ${data.count} novas partidas. Rating atualizado.`);
                }
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error("Sync error:", error);
            alert("Erro ao sincronizar.");
        } finally {
            setSyncingSteamId(null);
        }
    };

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

    const handleClearLobby = () => {
        if (window.confirm("Deseja realmente remover todos os jogadores e limpar o saguão?")) {
            setSelectedPlayers([]);
            setVetoMaps({});
            setVetoTurn("A");
            setVetoHistory([]);
        }
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
        
        const lastPick = [...vetoHistory].reverse().find(h => h.type === "pick");
        const selectedMapName = lastPick ? (mapPool.find(m => m.id === lastPick.map)?.name || "Não definido") : "Não definido";
        const pickMethod = lastPick?.team === "system" ? "Aleatório" : "Manual";

        try {
            const res = await fetch("/api/discord/team-announce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    teamA, teamB, avgA, avgB, balanceMode,
                    mapName: selectedMapName,
                    pickMethod
                }),
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

    const handleSendSteam = async () => {
        if (teamA.length === 0 && teamB.length === 0) {
            alert("Selecione os times antes de enviar.");
            return;
        }
        setSteamStatus("sending");

        const lastPick = [...vetoHistory].reverse().find(h => h.type === "pick");
        const selectedMapName = lastPick ? (mapPool.find(m => m.id === lastPick.map)?.name || "Não definido") : "Não definido";
        const pickMethod = lastPick?.team === "system" ? "Aleatório" : "Manual";

        try {
            const res = await fetch("/api/steam/send-teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    teamA, teamB, avgA, avgB, balanceMode,
                    mapName: selectedMapName,
                    pickMethod
                }),
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setSteamStatus("sent");
                setTimeout(() => setSteamStatus("idle"), 3000);
            } else {
                console.error("Steam API Error:", data);
                alert(`Erro ao enviar: ${data.message || data.error || "Erro desconhecido"}`);
                setSteamStatus("error");
                setTimeout(() => setSteamStatus("idle"), 4000);
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão ao tentar enviar para a Steam.");
            setSteamStatus("error");
            setTimeout(() => setSteamStatus("idle"), 4000);
        }
    };


    const handleAutoBalance = (overrideMode?: "standard" | "resenha" | "tropa") => {
        if (selectedPlayers.length !== 10) {
            if (!overrideMode) alert("Selecione exatamente 10 jogadores para balancear os times automaticamente.");
            return;
        }

        const modeToUse = overrideMode || balanceMode;

        const getRatingForBalance = (p: Player) => {
            if (modeToUse === "resenha") {
                return p.tempResenhaRating !== undefined ? p.tempResenhaRating : (p.resenhaRating || 5);
            }
            if (modeToUse === "tropa") {
                const pR = p.tempRating ?? p.rating ?? 0;
                const premierNorm = Math.min(100, pR / 300);
                const faceitNorm = (p.faceitLevel ?? 0) * 10;
                const gcNorm = ((p.gcLevel ?? 0) / 21) * 100;
                return Math.max(premierNorm, faceitNorm, gcNorm);
            }
            return p.tempRating !== undefined ? p.tempRating : p.rating;
        };

        const sorted = [...selectedPlayers].sort((a, b) => getRatingForBalance(b) - getRatingForBalance(a));
        
        // Exhaustive search for the best split (126 combinations)
        let bestDiff = Infinity;
        let bestSplit: Player[] = [];

        const findBestSplit = (index: number, teamA: Player[], teamB: Player[], sumA: number, sumB: number) => {
            if (index === 10) {
                const diff = Math.abs(sumA - sumB);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestSplit = [...teamA.map(p => ({ ...p, assignment: "A" as const })), ...teamB.map(p => ({ ...p, assignment: "B" as const }))];
                }
                return;
            }

            const p = sorted[index];
            const pRating = getRatingForBalance(p);

            // Try adding to Team A if not full
            if (teamA.length < 5) {
                findBestSplit(index + 1, [...teamA, p], teamB, sumA + pRating, sumB);
            }

            // Try adding to Team B if not full
            if (teamB.length < 5) {
                findBestSplit(index + 1, teamA, [...teamB, p], sumA, sumB + pRating);
            }
        };

        findBestSplit(0, [], [], 0, 0);
        setSelectedPlayers(bestSplit);
    };

    const handleMapAction = (mapId: string, type: "ban" | "pick", isRandom = false) => {
        if (vetoMaps[mapId]) return;

        const team = (isRandom ? "system" : vetoTurn) as "A" | "B" | "system";
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

    const getPlayerRating = (p: Player) => {
        if (balanceMode === "resenha") {
            return p.tempResenhaRating !== undefined ? p.tempResenhaRating : (p.resenhaRating || 5);
        }
        if (balanceMode === "tropa") {
            const premierNorm = Math.min(100, (p.tempRating ?? p.rating ?? 0) / 300);
            const faceitNorm = (p.faceitLevel ?? 0) * 10;
            const gcNorm = ((p.gcLevel ?? 0) / 21) * 100;
            return Math.max(premierNorm, faceitNorm, gcNorm);
        }
        return p.tempRating !== undefined ? p.tempRating : p.rating;
    };

    const avgA = teamA.length > 0 ? (
        balanceMode === "resenha" || balanceMode === "tropa"
            ? Math.round((teamA.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamA.length) * 10) / 10
            : Math.round(teamA.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamA.length)
    ) : 0;

    const avgB = teamB.length > 0 ? (
        balanceMode === "resenha" || balanceMode === "tropa"
            ? Math.round((teamB.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamB.length) * 10) / 10
            : Math.round(teamB.reduce((acc, p) => acc + getPlayerRating(p), 0) / teamB.length)
    ) : 0;

    const handleTempRating = (steamId: string, field: "sr" | "resenha", value: number) => {
        setSelectedPlayers(prev => prev.map(p => p.steamId === steamId
            ? { ...p, ...(field === "sr" ? { tempRating: value } : { tempResenhaRating: value }) }
            : p
        ));
    };

    const getMatchedPlayer = (member: any) => {
        let found = dbPlayers.find(p => p.discordId === member.id);
        if (found) return found;

        const searchName = (member.nick || member.username || "").toLowerCase();
        found = dbPlayers.find(p => 
            p.nickname.toLowerCase() === searchName || 
            (p.steamName && p.steamName.toLowerCase() === searchName)
        );
        return found;
    };

    const matchedOnlinePlayers = discordOnline.members
        .map(member => {
            const player = getMatchedPlayer(member);
            if (discordOnlyVoice && !member.channel_id) return null;
            if (player) {
                const isAdded = selectedPlayers.some(sp => sp.steamId === player.steamId);
                return { member, player, isAdded };
            } else {
                const isAdded = selectedPlayers.some(sp => sp.steamId === `discord_${member.id}`);
                const guestP: Player = {
                    steamId: `discord_${member.id}`,
                    nickname: member.nick || member.username,
                    avatar: member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`,
                    rating: 5000,
                    resenhaRating: 5,
                    isGuest: true,
                    assignment: "unassigned" as const
                };
                return { member, player: guestP, isAdded, isUnmatched: true };
            }
        })
        .filter(item => item !== null) as { member: any, player: Player, isAdded: boolean, isUnmatched?: boolean }[];

    const availableDbPlayers = dbPlayers.filter(dbP => !selectedPlayers.some(sp => sp.steamId === dbP.steamId));
    const filteredDbPool = availableDbPlayers.filter(p => p.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 md:p-8 space-y-8 pb-32">
            {/* ── HERO HEADER ── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-zinc-950/80 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-md shadow-2xl">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 w-full">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/5 border border-purple-500/30 flex items-center justify-center shadow-lg relative group overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                        <Users className="text-purple-400 w-8 h-8 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] relative z-10 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none flex flex-wrap gap-x-3 gap-y-1">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400">Sorteador de</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Times</span>
                        </h1>
                        <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2 flex flex-wrap items-center gap-2">
                            <span className="w-4 h-px bg-purple-500/40" />
                            <span>Auto-Balance System</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-zinc-400">Monte o saguão com 10 jogadores para um equilíbrio competitivo perfeito</span>
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Lado Esquerdo: Base de Dados & Convidados */}
                <div className="lg:w-[22%] flex flex-col space-y-6">
                    
                    {/* Widget: Discord Online */}
                    <div className="bg-zinc-950/85 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/45 to-transparent" />
                        
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase text-zinc-100 tracking-wider flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Discord Online
                                {discordOnline.members.length > 0 && (
                                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-black ml-1">
                                        {matchedOnlinePlayers.length}
                                    </span>
                                )}
                            </h2>
                            <button 
                                onClick={fetchDiscordOnline}
                                disabled={discordOnline.loading}
                                className={`p-2 rounded-xl transition-all border bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-50`}
                                title="Atualizar Discord"
                            >
                                <RefreshCw size={14} className={discordOnline.loading ? "animate-spin text-indigo-400" : ""} />
                            </button>
                        </div>

                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 gap-1.5 shadow-inner">
                            <button
                                onClick={() => setDiscordOnlyVoice(true)}
                                className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all ${discordOnlyVoice ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Salas de Voz
                            </button>
                            <button
                                onClick={() => setDiscordOnlyVoice(false)}
                                className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all ${!discordOnlyVoice ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Todos Online
                            </button>
                        </div>

                        {discordOnline.loading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                <Loader2 size={20} className="animate-spin text-indigo-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Buscando presença...</span>
                            </div>
                        ) : discordOnline.widgetDisabled ? (
                            <div className="bg-indigo-950/20 border border-indigo-500/25 p-4 rounded-2xl space-y-2 text-left">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                    🔌 Widget Desabilitado
                                </h4>
                                <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
                                    Habilite o widget do servidor no Discord para puxar os membros online automaticamente:
                                </p>
                                <ol className="text-[8.5px] text-zinc-500 space-y-1.5 list-decimal list-inside font-mono">
                                    <li>Abra o **Discord** &gt; **Configurações do Servidor**</li>
                                    <li>No menu esquerdo, clique em **Engajamento** e depois em **Widget**</li>
                                    <li>Marque a opção **Habilitar Widget do Servidor**</li>
                                </ol>
                                {discordOnline.inviteUrl && (
                                    <a href={discordOnline.inviteUrl} target="_blank" rel="noreferrer" className="block text-center bg-indigo-650 hover:bg-indigo-500 text-white font-black uppercase text-[8px] tracking-wider py-1.5 rounded-lg mt-2 transition-all">
                                        Entrar no Servidor
                                    </a>
                                )}
                            </div>
                        ) : matchedOnlinePlayers.length === 0 ? (
                            <div className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl text-center space-y-1">
                                <p className="text-[10px] text-zinc-400 font-bold">Nenhum jogador online</p>
                                <p className="text-[8px] text-zinc-600 leading-relaxed font-medium">
                                    Nenhum membro online no Discord está cadastrado na base com o ID correspondente.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between pb-1">
                                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider">Disponíveis para Jogar</span>
                                    {matchedOnlinePlayers.some(item => !item.isAdded) && (
                                        <button 
                                            onClick={() => {
                                                const toAdd = matchedOnlinePlayers.filter(item => !item.isAdded).map(item => item.player);
                                                const spaceLeft = 10 - selectedPlayers.length;
                                                const slice = toAdd.slice(0, spaceLeft);
                                                if (slice.length > 0) {
                                                    setSelectedPlayers(prev => [...prev, ...slice.map(p => ({ ...p, assignment: "unassigned" as const }))]);
                                                }
                                            }}
                                            className="text-[8px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            + Adicionar Todos
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                                    {matchedOnlinePlayers.map(({ member, player, isAdded, isUnmatched }) => {
                                        let gradeColor = "border-white/5 hover:border-white/20";
                                        
                                        if (isUnmatched) {
                                            gradeColor = "border-yellow-500/10 border-dashed hover:border-yellow-500/35 hover:bg-yellow-500/[0.01]";
                                        } else {
                                            const premierNorm = Math.min(100, (player.tempRating ?? player.rating ?? 0) / 300);
                                            const faceitNorm = (player.faceitLevel ?? 0) * 10;
                                            const gcNorm = ((player.gcLevel ?? 0) / 21) * 100;
                                            const tropaScore = Math.max(premierNorm, faceitNorm, gcNorm);

                                            if (tropaScore > 80) gradeColor = "border-purple-500/20 hover:border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.06)]";
                                            else if (tropaScore > 55) gradeColor = "border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.06)]";
                                        }

                                        return (
                                            <div key={player.steamId} className={`flex items-center justify-between p-2.5 bg-zinc-900/45 border rounded-2xl transition-all duration-300 ${gradeColor} ${isAdded ? 'opacity-50' : ''}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="relative shrink-0">
                                                        <img src={player.avatar || member.avatar_url} alt={player.nickname} className="w-8 h-8 rounded-xl border border-white/10" />
                                                        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-black ${member.channel_id ? 'bg-green-500 animate-pulse' : 'bg-green-600'}`} title={member.channel_id ? "Em canal de voz" : "Online no Discord"} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-[10px] text-white truncate uppercase tracking-wider">{player.nickname}</p>
                                                        {isUnmatched && (
                                                            <p className="text-[6.5px] text-yellow-500/90 font-mono font-black uppercase tracking-wider mb-0.5">
                                                                ⚠️ Não Vinculado
                                                            </p>
                                                        )}
                                                        {member.channel_id ? (() => {
                                                            const voiceChannel = discordOnline.channels?.find(c => c.id === member.channel_id);
                                                            const voiceName = voiceChannel ? voiceChannel.name : "Sala de Voz";
                                                            return (
                                                                <p className="text-[7px] text-green-400 font-bold truncate tracking-wide flex items-center gap-1">
                                                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                                                    </span>
                                                                    🔊 {voiceName}
                                                                </p>
                                                            );
                                                        })() : member.game ? (
                                                            <p className="text-[7px] text-zinc-500 font-mono font-bold truncate tracking-wide">
                                                                Jogando: {member.game.name}
                                                            </p>
                                                        ) : (
                                                            <p className="text-[7px] text-zinc-500 font-mono font-bold truncate tracking-wide">
                                                                Online
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => !isAdded && handleSelectPlayer(player)}
                                                    disabled={isAdded}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                                        isAdded 
                                                            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                                                            : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-indigo-650 hover:border-indigo-500 active:scale-95'
                                                    }`}
                                                >
                                                    {isAdded ? <Check size={10} /> : <Plus size={10} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-zinc-950/85 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/45 to-transparent" />
                        
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase text-zinc-100 tracking-wider flex items-center gap-2">
                                <Search size={14} className="text-purple-500 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" /> Plantel do CS
                            </h2>
                            <button 
                                onClick={() => setShowGuestForm(!showGuestForm)}
                                className={`p-2 rounded-xl transition-all border ${showGuestForm ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95'}`}
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
                                    <div className="bg-black/45 p-4 rounded-2xl border border-purple-500/20 space-y-3 mb-2 shadow-inner">
                                        <p className="text-[9px] text-purple-400 font-black uppercase tracking-widest">Novo Convidado</p>
                                        <input 
                                            type="text" 
                                            placeholder="Nome / Apelido"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-purple-500/50 outline-none transition-all text-white placeholder-zinc-600"
                                        />
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Rating (ex: 15000)"
                                                value={guestRating}
                                                onChange={(e) => setGuestRating(e.target.value)}
                                                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-purple-500/50 outline-none transition-all text-white placeholder-zinc-600"
                                            />
                                            <button 
                                                onClick={handleAddGuest}
                                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-purple-900/20 transition-all active:scale-95 shrink-0"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Buscar jogador no banco..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900/40 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:border-purple-500/30 text-white placeholder-zinc-600 transition-all"
                            />
                        </div>

                        <div className="h-[calc(100vh-280px)] min-h-[450px] pb-6 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 animate-pulse bg-white/5 rounded-2xl border border-white/5" />
                                ))
                            ) : filteredDbPool.length === 0 ? (
                                <p className="text-zinc-600 text-[10px] text-center py-12 font-black uppercase tracking-widest">Nenhum jogador encontrado.</p>
                            ) : (
                                filteredDbPool.map(p => {
                                    const premierNorm = Math.min(100, (p.rating ?? 0) / 300);
                                    const faceitNorm = (p.faceitLevel ?? 0) * 10;
                                    const gcNorm = ((p.gcLevel ?? 0) / 21) * 100;
                                    const tropaScore = Math.max(premierNorm, faceitNorm, gcNorm);

                                    let gradeColor = "border-white/5 hover:border-purple-500/20";
                                    if (tropaScore > 80) gradeColor = "border-purple-500/20 hover:border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.05)]";
                                    else if (tropaScore > 55) gradeColor = "border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.05)]";

                                    return (
                                        <div key={p.steamId} onClick={() => handleSelectPlayer(p)} 
                                            className={`flex items-center gap-3 p-3 bg-zinc-900/30 border rounded-2xl cursor-pointer transition-all duration-300 group ${gradeColor}`}>
                                            <div className="relative shrink-0">
                                                <img src={p.avatar} alt={p.nickname} className="w-10 h-10 rounded-xl border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300" />
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-xs text-white truncate group-hover:text-purple-400 transition-colors uppercase tracking-wide">{p.nickname}</p>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    <span className={`text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.5 rounded font-mono font-black ${balanceMode === 'standard' ? 'ring-1 ring-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.25)] opacity-100' : 'opacity-65'}`}>{p.rating || 0} SR</span>
                                                    <span className={`text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-mono font-black ${balanceMode === 'resenha' ? 'ring-1 ring-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)] opacity-100' : 'opacity-65'}`}>{(p.resenhaRating || 5).toFixed(1)} ★</span>
                                                    <span className={`text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-mono font-black ${balanceMode === 'tropa' ? 'ring-1 ring-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.25)] opacity-100' : 'opacity-65'}`}>
                                                        {tropaScore.toFixed(1)} TR
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(p as any).hasSync && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSyncPlayer(p.steamId);
                                                        }}
                                                        disabled={syncingSteamId === p.steamId}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                            syncingSteamId === p.steamId 
                                                                ? 'bg-yellow-500/20 text-yellow-500 animate-spin' 
                                                                : 'bg-white/5 text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500/30'
                                                        } border border-transparent`}
                                                        title="Sincronizar Partidas"
                                                    >
                                                        <Flame size={12} className={syncingSteamId === p.steamId ? 'animate-pulse' : ''} />
                                                    </button>
                                                )}
                                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:bg-purple-600 group-hover:border-purple-500 group-hover:text-white transition-all active:scale-95 shrink-0">
                                                    <Plus size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Arena de Montagem */}
                <div className="lg:w-[78%] flex flex-col space-y-6">
                    
                    {/* Unassigned Grid (Top) */}
                    {unassigned.length > 0 && (
                        <div className="bg-zinc-950/80 p-5 rounded-3xl border border-white/5 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                                <Users size={14} className="text-purple-500 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]"/>
                                Jogadores no Saguão
                                <span className="ml-auto bg-black/45 px-3 py-1.5 rounded-xl text-[9px] text-zinc-500 border border-white/5">{unassigned.length} aguardando alocação</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                                {unassigned.map(p => {
                                    const pR = p.tempRating ?? p.rating ?? 0;
                                    const premierNorm = Math.min(100, pR / 300);
                                    const faceitNorm = (p.faceitLevel ?? 0) * 10;
                                    const gcNorm = ((p.gcLevel ?? 0) / 21) * 100;
                                    const tropaScore = Math.max(premierNorm, faceitNorm, gcNorm);

                                    let skillBorder = "border-white/5";
                                    if (tropaScore > 80) skillBorder = "border-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.05)]";
                                    else if (tropaScore > 55) skillBorder = "border-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.05)]";

                                    return (
                                        <div key={p.steamId} className={`group relative hover:z-50 flex items-center bg-zinc-950 border p-2.5 pr-4 rounded-2xl transition-all duration-300 hover:bg-zinc-900/40 hover:border-purple-500/40 shadow-lg ${skillBorder}`}>
                                            <div className="relative shrink-0 group-hover:opacity-10 transition-opacity duration-300">
                                                <img src={p.avatar} title={p.nickname} className="w-10 h-10 rounded-xl border border-white/10 shadow-md" />
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                            </div>
                                            <div className="flex flex-col ml-3 group-hover:opacity-10 transition-opacity duration-300 min-w-0 flex-1">
                                                <p className="font-black text-xs text-white truncate uppercase tracking-wide">{p.nickname}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    {editingUnassigned?.steamId === p.steamId && editingUnassigned.field === "sr" ? (
                                                        <input autoFocus type="number" value={editingUnassigned.value}
                                                            onChange={e => setEditingUnassigned({ ...editingUnassigned, value: e.target.value })}
                                                            onBlur={() => { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "sr", n); setEditingUnassigned(null); }}
                                                            onKeyDown={e => { if (e.key === "Enter") { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "sr", n); setEditingUnassigned(null); } if (e.key === "Escape") setEditingUnassigned(null); }}
                                                            className="w-20 bg-zinc-900 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none" />
                                                    ) : (
                                                        <button onClick={e => { e.stopPropagation(); setEditingUnassigned({ steamId: p.steamId, field: "sr", value: String(p.tempRating ?? p.rating) }); }} className="text-[8px] font-mono font-black hover:text-yellow-400 transition-colors flex items-center gap-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 rounded py-0.5" title="Editar SR">
                                                            {p.tempRating ?? p.rating} SR{p.tempRating !== undefined && <Pencil size={7} />}
                                                        </button>
                                                    )}
                                                    <span className="text-[8px] font-mono font-black flex items-center gap-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 px-1.5 rounded py-0.5" title="Tropa Rating (Unified Skill Score)">
                                                        {tropaScore.toFixed(1)} TR
                                                    </span>
                                                    {editingUnassigned?.steamId === p.steamId && editingUnassigned.field === "resenha" ? (
                                                        <input autoFocus type="number" step="0.1" value={editingUnassigned.value}
                                                            onChange={e => setEditingUnassigned({ ...editingUnassigned, value: e.target.value })}
                                                            onBlur={() => { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "resenha", n); setEditingUnassigned(null); }}
                                                            onKeyDown={e => { if (e.key === "Enter") { const n = parseFloat(editingUnassigned.value); if (!isNaN(n) && n > 0) handleTempRating(p.steamId, "resenha", n); setEditingUnassigned(null); } if (e.key === "Escape") setEditingUnassigned(null); }}
                                                            className="w-16 bg-zinc-900 border border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none" />
                                                    ) : (
                                                        <button onClick={e => { e.stopPropagation(); setEditingUnassigned({ steamId: p.steamId, field: "resenha", value: (p.tempResenhaRating ?? p.resenhaRating ?? 5).toFixed(1) }); }} className="text-[8px] font-mono font-black hover:text-purple-300 transition-colors flex items-center gap-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 rounded py-0.5" title="Editar Resenha">
                                                            {(p.tempResenhaRating ?? p.resenhaRating ?? 5).toFixed(1)} ★{p.tempResenhaRating !== undefined && <Pencil size={7} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Modern overlay selector */}
                                            <div className="absolute inset-0 flex items-stretch justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-300 z-50 bg-black/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
                                                <button onClick={() => handleAssign(p.steamId, "A")} className="flex-1 bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 hover:from-yellow-500/30 hover:to-yellow-500/15 text-yellow-500 hover:text-yellow-400 flex flex-col items-center justify-center gap-1.5 text-[9px] font-black uppercase transition-all" title="Para Time A"><ArrowLeft size={14} className="animate-pulse" /> Time A</button>
                                                <button onClick={() => handleRemovePlayer(p.steamId)} className="px-5 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 border-x border-white/5 transition-all flex items-center justify-center" title="Remover"><X size={14} /></button>
                                                <button onClick={() => handleAssign(p.steamId, "B")} className="flex-1 bg-gradient-to-l from-blue-500/20 to-blue-500/5 hover:from-blue-500/30 hover:to-blue-500/15 text-blue-400 hover:text-blue-300 flex flex-col items-center justify-center gap-1.5 text-[9px] font-black uppercase transition-all" title="Para Time B">Time B <ArrowRight size={14} className="animate-pulse" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Status Bar */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-zinc-950/85 p-5 rounded-3xl border border-white/5 backdrop-blur-xl gap-4 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-500/10 to-transparent" />
                        <div className="flex items-center gap-5 shrink-0">
                            {/* SVG Circular Progress */}
                            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                                <svg className="absolute inset-0 -rotate-90 w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.15)]" viewBox="0 0 36 36">
                                    <path
                                        className="text-zinc-900"
                                        strokeWidth="3.5"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={`${selectedPlayers.length === 10 ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'} transition-all duration-500`}
                                        strokeWidth="3.5"
                                        strokeDasharray={`${(selectedPlayers.length / 10) * 100}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                
                                <div className="absolute inset-0 flex items-center justify-center mt-0.5">
                                    <span className={`text-lg font-black ${selectedPlayers.length === 10 ? 'text-green-400' : 'text-white'}`}>
                                        {selectedPlayers.length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none mb-1">
                                    Membros
                                </span>
                                <span className="text-xs text-white font-black uppercase tracking-wider leading-none">
                                    Selecionados
                                </span>
                                <span className={`text-[9px] font-mono mt-1 ${selectedPlayers.length === 10 ? 'text-green-500/80 font-black uppercase' : 'text-zinc-600'}`}>
                                    {selectedPlayers.length === 10 ? 'Lobby Completo' : `${10 - selectedPlayers.length} vaga(s) restante(s)`}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 mr-2">
                                <button 
                                    onClick={() => { setBalanceMode("standard"); handleAutoBalance("standard"); }}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${balanceMode === "standard" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-900/20" : "text-zinc-500 hover:text-white"}`}
                                >
                                    Standard
                                </button>
                                <button 
                                    onClick={() => { setBalanceMode("tropa"); handleAutoBalance("tropa"); }}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${balanceMode === "tropa" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-900/20" : "text-zinc-500 hover:text-white"}`}
                                >
                                    Tropa
                                </button>
                                <button 
                                    onClick={() => { setBalanceMode("resenha"); handleAutoBalance("resenha"); }}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${balanceMode === "resenha" ? "bg-purple-500 text-black shadow-lg shadow-purple-900/20" : "text-zinc-500 hover:text-white"}`}
                                >
                                    Resenha
                                </button>
                            </div>

                            <button 
                                onClick={handleResetTeams}
                                disabled={selectedPlayers.every(p => p.assignment === "unassigned")}
                                className={`flex items-center justify-center p-3 rounded-xl font-black transition-all shrink-0 border ${!selectedPlayers.every(p => p.assignment === "unassigned") ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/10 hover:border-white/30 active:scale-95 shadow-md' : 'bg-white/5 text-zinc-800 border-white/5 cursor-not-allowed'}`}
                                title="Voltar times para o Saguão"
                            >
                                <Users size={14} />
                            </button>
                            <button 
                                onClick={handleClearLobby}
                                disabled={selectedPlayers.length === 0}
                                className={`flex items-center justify-center p-3 rounded-xl font-black transition-all shrink-0 border ${selectedPlayers.length > 0 ? 'bg-red-900/10 hover:bg-red-900/20 text-red-500 hover:text-red-400 border-red-500/20 hover:border-red-500/40 active:scale-95 shadow-md' : 'bg-white/5 text-zinc-800 border-white/5 cursor-not-allowed'}`}
                                title="Limpar todo o Saguão"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button 
                                onClick={() => handleCopyTeam("both")}
                                disabled={teamA.length === 0 && teamB.length === 0}
                                className={`flex items-center gap-2 px-4 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-wide transition-all shadow-lg shrink-0 border ${
                                    copiedTeam === "both"
                                        ? 'bg-green-600 text-white border-green-500/50 shadow-green-500/20'
                                        : (teamA.length > 0 || teamB.length > 0)
                                            ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/10 hover:border-white/30 active:scale-95'
                                            : 'bg-white/5 text-zinc-700 cursor-not-allowed border-white/5'
                                }`}
                                title="Copiar nomes dos dois times"
                            >
                                {copiedTeam === "both" ? <Check size={14} /> : <ClipboardList size={14} />}
                                <span className="hidden sm:inline">{copiedTeam === "both" ? "Copiado!" : "Copiar"}</span>
                            </button>
                            <button 
                                onClick={() => handleAutoBalance()}
                                disabled={selectedPlayers.length !== 10}
                                className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-wide transition-all shadow-lg shrink-0 ${selectedPlayers.length === 10 ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95 border border-purple-400/50' : 'bg-white/5 text-zinc-750 cursor-not-allowed border border-white/5'}`}
                            >
                                <Shuffle size={14} /> Auto-Balance
                            </button>
                            <button
                                onClick={handleSendDiscord}
                                disabled={discordStatus === "sending" || (teamA.length === 0 && teamB.length === 0)}
                                className={`flex items-center gap-2 px-4 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-wide transition-all shadow-lg shrink-0 border ${
                                    discordStatus === "sent"
                                        ? 'bg-green-600 text-white border-green-500/50 shadow-green-500/20'
                                        : discordStatus === "error"
                                            ? 'bg-red-700 text-white border-red-500/50'
                                            : discordStatus === "sending"
                                                ? 'bg-indigo-700 text-white border-indigo-500/50 cursor-wait'
                                                : (teamA.length > 0 || teamB.length > 0)
                                                    ? 'bg-indigo-650 hover:bg-indigo-500 text-white border-indigo-400/50 active:scale-95 shadow-indigo-900/20 shadow-lg'
                                                    : 'bg-white/5 text-zinc-700 cursor-not-allowed border-white/5'
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
                            <button
                                onClick={handleSendSteam}
                                disabled={steamStatus === "sending" || (teamA.length === 0 && teamB.length === 0)}
                                className={`flex items-center gap-2 px-4 py-4 rounded-xl font-black uppercase text-xs transition-all shadow-lg shrink-0 border ${
                                    steamStatus === "sent"
                                        ? 'bg-green-600 text-white border-green-500/50 shadow-green-500/20'
                                        : steamStatus === "error"
                                            ? 'bg-red-700 text-white border-red-500/50'
                                            : steamStatus === "sending"
                                                ? 'bg-yellow-700 text-white border-yellow-500/50 cursor-wait'
                                                : (teamA.length > 0 || teamB.length > 0)
                                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/10 active:scale-95'
                                                    : 'bg-white/5 text-zinc-600 cursor-not-allowed border-white/5'
                                }`}
                                title="Enviar times para a Steam dos jogadores"
                            >
                                {steamStatus === "sending" && <Loader2 size={16} className="animate-spin" />}
                                {steamStatus === "sent" && <Check size={16} />}
                                {steamStatus === "error" && <X size={16} />}
                                {steamStatus === "idle" && <Send size={16} className="text-yellow-500" />}
                                <span className="hidden sm:inline">
                                    {steamStatus === "sending" ? "Enviando..." : steamStatus === "sent" ? "Enviado!" : steamStatus === "error" ? "Erro" : "Steam"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Veto Arena / Time A vs Time B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                        {/* VS Badge with Pulse */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 z-20 pointer-events-none flex items-center justify-center">
                            <motion.div 
                                animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.45, 0.2] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse"
                            />
                            <div className="w-12 h-12 bg-zinc-950/95 border-2 border-white/10 rounded-full flex items-center justify-center font-black italic text-zinc-300 select-none shadow-2xl relative overflow-hidden backdrop-blur-md">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/5 pointer-events-none" />
                                <span className="relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">VS</span>
                            </div>
                        </div>

                        {/* TEAM A */}
                        <div className="bg-zinc-950/85 rounded-3xl border border-yellow-500/10 hover:border-yellow-500/35 overflow-hidden transition-all duration-300 h-full shadow-2xl relative backdrop-blur-xl group">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent" />
                            <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/[0.02] to-transparent p-6 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">Time TR</h3>
                                    <button
                                        onClick={() => handleCopyTeam("A")}
                                        disabled={teamA.length === 0}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                                            copiedTeam === "A"
                                                ? 'bg-green-600 text-white border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                                : teamA.length > 0
                                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black active:scale-95 shadow-md hover:border-yellow-400'
                                                    : 'bg-white/5 text-zinc-700 border-white/5 cursor-not-allowed'
                                        }`}
                                        title="Copiar nomes do Time TR"
                                    >
                                        {copiedTeam === "A" ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedTeam === "A" ? "Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <Medal size={14} className="text-yellow-500/60" />
                                    <p className="text-[10px] font-mono text-zinc-500 font-black uppercase tracking-wider">
                                        Média {balanceMode === "resenha" ? "Resenha" : balanceMode === "tropa" ? "Tropa" : "SR"}: <span className={`text-xs font-black ${balanceMode === 'tropa' ? 'text-emerald-400' : 'text-white'}`}>{avgA}{balanceMode === "resenha" ? " ★" : balanceMode === "tropa" ? " TR" : ""}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamA.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveRight={() => handleAssign(p.steamId, "B")} side="left" balanceMode={balanceMode} onEditRating={(field, val) => handleTempRating(p.steamId, field, val)} />
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
                        <div className="bg-zinc-950/85 rounded-3xl border border-blue-500/10 hover:border-blue-500/35 overflow-hidden transition-all duration-300 h-full shadow-2xl relative backdrop-blur-xl group">
                            <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-blue-500/20 to-transparent" />
                            <div className="bg-gradient-to-bl from-blue-500/10 via-blue-500/[0.02] to-transparent p-6 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => handleCopyTeam("B")}
                                        disabled={teamB.length === 0}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                                            copiedTeam === "B"
                                                ? 'bg-green-600 text-white border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                                : teamB.length > 0
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white active:scale-95 shadow-md hover:border-blue-400'
                                                    : 'bg-white/5 text-zinc-700 border-white/5 cursor-not-allowed'
                                        }`}
                                        title="Copiar nomes do Time CT"
                                    >
                                        {copiedTeam === "B" ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedTeam === "B" ? "Copiado" : "Copiar"}
                                    </button>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]">Time CT</h3>
                                </div>
                                <div className="flex items-center gap-2 mt-3 justify-end text-right">
                                    <p className="text-[10px] font-mono text-zinc-500 font-black uppercase tracking-wider">
                                        <span className={`text-xs font-black ${balanceMode === 'tropa' ? 'text-emerald-400' : 'text-white'}`}>{avgB}{balanceMode === "resenha" ? " ★" : balanceMode === "tropa" ? " TR" : ""}</span> :{balanceMode === "resenha" ? "Resenha" : balanceMode === "tropa" ? "Tropa" : "SR"} Média
                                    </p>
                                    <Medal size={14} className="text-blue-500/60" />
                                </div>
                            </div>
                            <div className="p-4 space-y-2 min-h-[300px]">
                                {teamB.map((p, idx) => (
                                    <PlayerCard key={p.steamId} player={p} onRemove={() => handleRemovePlayer(p.steamId)} onMoveUnassigned={() => handleAssign(p.steamId, "unassigned")} onMoveLeft={() => handleAssign(p.steamId, "A")} side="right" balanceMode={balanceMode} onEditRating={(field, val) => handleTempRating(p.steamId, field, val)} />
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
                    
                    {/* BALANCE DASHBOARD */}
                    <div className="bg-zinc-950/90 rounded-3xl border border-white/5 p-6 flex flex-col lg:flex-row items-center justify-between gap-8 backdrop-blur-xl relative overflow-hidden shadow-2xl mt-4">
                        {/* Immersive Background Gradients */}
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Center/Main Stats Area */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 w-full lg:w-auto flex-1 justify-center z-10">
                            
                            {/* Team A Stats */}
                            <div className="flex flex-col items-center sm:items-end w-32 shrink-0">
                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Time TR</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] tracking-tighter">{avgA}</span>
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">{balanceMode === "standard" ? "SR" : balanceMode === "tropa" ? "TR" : "★"}</span>
                                </div>
                            </div>

                            {/* Center Balance Visualization */}
                            <div className="flex flex-col items-center flex-1 max-w-md w-full gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1.5">Diferença de Força</span>
                                    <div className={`px-4 py-1.5 rounded-xl border flex items-center justify-center gap-2 backdrop-blur-md transition-all ${Math.abs(Number(avgA) - Number(avgB)) < (balanceMode === "standard" ? 400 : balanceMode === "tropa" ? 2 : 0.2) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]'}`}>
                                        <span className="text-xs font-bold opacity-70">GAP</span>
                                        <span className="text-lg font-black leading-none">{Math.abs(Number(avgA) - Number(avgB)).toFixed(1)}</span>
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="w-full relative pt-4">
                                    {/* Labels floating above the bar */}
                                    <div className="absolute inset-x-0 top-0 flex justify-between px-1">
                                        {Number(avgA) > Number(avgB) ? (
                                            <span className="text-[9px] font-black text-yellow-500 uppercase animate-pulse drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Favorito</span>
                                        ) : <span className="opacity-0">.</span>}
                                        {Number(avgB) > Number(avgA) ? (
                                            <span className="text-[9px] font-black text-blue-400 uppercase animate-pulse drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">Favorito</span>
                                        ) : <span className="opacity-0">.</span>}
                                    </div>
                                    
                                    <div className="h-2.5 bg-black/60 rounded-full overflow-hidden relative border border-white/10 shadow-inner">
                                        <motion.div 
                                            initial={{ width: "50%" }}
                                            animate={{ 
                                                width: (() => {
                                                    const diff = Number(avgA) - Number(avgB);
                                                    let sensitivity = 1;
                                                    if (balanceMode === "standard") sensitivity = 0.02;
                                                    else if (balanceMode === "tropa") sensitivity = 4;
                                                    else if (balanceMode === "resenha") sensitivity = 30;
                                                    const percentage = 50 + (diff * sensitivity);
                                                    return `${Math.max(5, Math.min(95, percentage))}%`;
                                                })(),
                                                backgroundColor: Math.abs(Number(avgA) - Number(avgB)) < (balanceMode === "standard" ? 400 : balanceMode === "tropa" ? 2 : 0.2) ? "#10b981" : "#f59e0b"
                                            }}
                                            className="absolute inset-0 h-full shadow-[0_0_15px_currentColor] rounded-full transition-all duration-700 ease-out"
                                        />
                                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-10" />
                                    </div>
                                </div>
                            </div>

                            {/* Team B Stats */}
                            <div className="flex flex-col items-center sm:items-start w-32 shrink-0">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">Time CT</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] tracking-tighter">{avgB}</span>
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">{balanceMode === "standard" ? "SR" : balanceMode === "tropa" ? "TR" : "★"}</span>
                                </div>
                            </div>

                        </div>

                        {/* Divider for Desktop */}
                        <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent z-10" />

                        {/* Lobby Level */}
                        <div className="flex flex-col items-center lg:items-start z-10 w-full lg:w-48 shrink-0">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Classificação do Lobby</span>
                            <div className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex items-center justify-center backdrop-blur-md hover:bg-white/10 transition-colors">
                                {(() => {
                                    const avgTotal = (Number(avgA) + Number(avgB)) / 2;
                                    let isElite = false;
                                    let isComp = false;

                                    if (balanceMode === "standard") {
                                        isElite = avgTotal > 20000;
                                        isComp = avgTotal > 14000;
                                    } else if (balanceMode === "tropa") {
                                        isElite = avgTotal > 80;
                                        isComp = avgTotal > 55;
                                    } else {
                                        isElite = avgTotal > 8.5;
                                        isComp = avgTotal > 6.5;
                                    }

                                    if (isElite) return <span className="text-sm font-black text-purple-400 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"><Trophy size={18} /> ELITE MIX</span>;
                                    if (isComp) return <span className="text-sm font-black text-blue-400 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"><Medal size={18} /> COMPETITIVO</span>;
                                    return <span className="text-sm font-black text-zinc-400 flex items-center gap-2"><Users size={18} /> CASUAL</span>;
                                })()}
                            </div>
                        </div>
                    </div>


                    {/* ── MAP VETO SECTION (Integrated) ── */}
                    <div className="mt-6 space-y-4 bg-zinc-950/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 border-b border-white/5 pb-5">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/5 border border-yellow-500/30 flex items-center justify-center shadow-lg">
                                        <MapIcon className="text-yellow-500 w-5 h-5 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                    </div>
                                    Veto de Mapas
                                </h2>
                                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                                    <span className="w-6 h-px bg-yellow-500/30" />
                                    <span>Selecione os mapas ou use o sorteador aleatório</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={resetVeto}
                                    className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-500 hover:text-white hover:border-white/30 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
                                    title="Resetar Veto"
                                >
                                    <RotateCcw size={15} />
                                </button>
                                <button 
                                    onClick={handleRandomMap}
                                    className="flex items-center gap-2 px-5 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-wide rounded-xl transition-all shadow-xl active:scale-95 border border-yellow-400/50 shadow-yellow-950/20"
                                >
                                    <Shuffle size={12} /> Mapa Aleatório
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col 2xl:flex-row gap-6">
                            {/* Map Grid */}
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                                {mapPool.map((map) => {
                                    const state = vetoMaps[map.id];
                                    const isBanned = state?.type === "ban";
                                    const isPicked = state?.type === "pick";
                                    
                                    return (
                                        <motion.div 
                                            key={map.id}
                                            layout
                                            className={`relative aspect-[4/3] rounded-2xl overflow-hidden border transition-all duration-300 group ${
                                                isBanned ? 'border-red-500/40 opacity-30 grayscale' :
                                                isPicked ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.25)] ring-1 ring-green-500/50' :
                                                'border-white/5 hover:border-yellow-500/40'
                                            }`}
                                        >
                                            <img src={map.image} alt={map.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
                                            
                                            <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-black italic uppercase tracking-tighter text-white drop-shadow-md">
                                                        {map.name}
                                                    </span>
                                                    {state && (
                                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                                                            state.type === "pick" ? 'bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                                        }`}>
                                                            {state.type === "pick" ? "Pick" : "Ban"}
                                                        </span>
                                                    )}
                                                </div>

                                                {!state && (
                                                    <div className="flex gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                        <button 
                                                            onClick={() => handleMapAction(map.id, "pick")}
                                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg shadow-green-950/20 active:scale-95 transition-all"
                                                        >
                                                            Pick
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMapAction(map.id, "ban")}
                                                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg shadow-red-950/20 active:scale-95 transition-all"
                                                        >
                                                            Ban
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isBanned && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                    <div className="text-red-500 text-lg font-black border-2 border-red-500/80 px-3.5 py-0.5 rounded-xl rotate-[-12deg] shadow-2xl bg-black/60 backdrop-blur-sm tracking-wider uppercase">
                                                        BAN
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Veto Log / History */}
                            <div className="2xl:w-72 shrink-0">
                                <div className="bg-black/45 p-5 rounded-3xl border border-white/5 h-full flex flex-col shadow-inner backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                            <History size={14} className="text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]" /> Log de Veto
                                        </h3>
                                        <span className={`text-[8px] font-black tracking-wider px-2.5 py-1 rounded-xl ${vetoTurn === "A" ? 'bg-yellow-500 text-black shadow-[0_0_8px_rgba(234,179,8,0.25)]' : 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.25)]'}`}>
                                            TURNO {vetoTurn}
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-2 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                                        {vetoHistory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-12">
                                                <MapIcon size={32} className="mb-2 text-zinc-600" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Aguardando ações</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {vetoHistory.map((entry, i) => {
                                                    const mapData = mapPool.find(m => m.id === entry.map);
                                                    const actionColor = entry.type === "pick" ? "border-l-green-500 bg-green-500/5 hover:bg-green-500/10" : "border-l-red-500 bg-red-500/5 hover:bg-red-500/10";
                                                    return (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: 10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            key={i} 
                                                            className={`flex items-center gap-3 p-2.5 rounded-2xl border-l-4 border-y border-r border-white/5 transition-all duration-300 overflow-hidden relative group ${actionColor}`}
                                                        >
                                                            <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:scale-105 transition-transform duration-500">
                                                                <img src={mapData?.image} className="w-full h-full object-cover blur-[1px]" />
                                                            </div>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-lg ${
                                                                entry.team === "A" ? 'bg-yellow-500 text-black font-black' : 
                                                                entry.team === "B" ? 'bg-blue-500 text-white font-black' : 
                                                                'bg-zinc-800 text-zinc-400'
                                                            }`}>
                                                                <span className="text-[10px]">{entry.team === "system" ? "SYS" : entry.team}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0 z-10">
                                                                <p className="font-black text-xs uppercase text-white truncate drop-shadow-md">
                                                                    {mapData?.name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${entry.type === "pick" ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                    <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">
                                                                        {entry.type === "pick" ? "Selecionado" : "Banido"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
