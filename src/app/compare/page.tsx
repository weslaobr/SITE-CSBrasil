"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Swords, Search, Trophy, Target, Crosshair, Shield, Star, TrendingUp, Users, RefreshCw } from "lucide-react";
import Link from "next/link";

interface RankUser {
    rank: number;
    steamId: string;
    nickname: string;
    avatar: string;
    rating: number;
    winRate: string;
    adr: number;
    hsPercentage: number;
    kdr: number;
    matchesPlayed: number;
    gcLevel: number;
    faceitLevel: number;
    faceitElo: number;
}

// CS2 Premier tiers (mesma lógica do ranking)
const PREMIER_TIERS = [
    { name: 'Gray',       min: 0,     max: 4999,    color: '#8a9ba8' },
    { name: 'Light Blue', min: 5000,  max: 9999,    color: '#4fc3f7' },
    { name: 'Blue',       min: 10000, max: 14999,   color: '#6b8fff' },
    { name: 'Purple',     min: 15000, max: 19999,   color: '#ce93d8' },
    { name: 'Pink',       min: 20000, max: 24999,   color: '#f06292' },
    { name: 'Red',        min: 25000, max: 29999,   color: '#ef9a9a' },
    { name: 'Gold',       min: 30000, max: Infinity, color: '#f5c518' },
];

function getTierColor(rating: number): string {
    if (rating <= 0) return '#52525b';
    return PREMIER_TIERS.find(t => rating >= t.min && rating <= t.max)?.color ?? '#f5c518';
}

interface StatBarProps {
    labelA: string;
    labelB: string;
    valA: number;
    valB: number;
    unit?: string;
    colorA: string;
    colorB: string;
    higherIsBetter?: boolean;
}

function StatBar({ labelA, labelB, valA, valB, unit = '', colorA, colorB, higherIsBetter = true }: StatBarProps) {
    const total = valA + valB;
    const pctA = total > 0 ? (valA / total) * 100 : 50;
    const pctB = 100 - pctA;
    const winnerA = higherIsBetter ? valA >= valB : valA <= valB;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-black">
                <span style={{ color: winnerA ? colorA : 'rgba(255,255,255,0.3)' }}>
                    {typeof valA === 'number' ? (Number.isInteger(valA) ? valA : valA.toFixed(2)) : valA}{unit}
                    {winnerA && <span className="ml-1 text-[8px]">✓</span>}
                </span>
                <span className="text-zinc-600 uppercase tracking-widest text-[8px] font-black">{labelA === labelB ? labelA : `${labelA} vs ${labelB}`}</span>
                <span style={{ color: !winnerA ? colorB : 'rgba(255,255,255,0.3)' }}>
                    {!winnerA && <span className="mr-1 text-[8px]">✓</span>}
                    {typeof valB === 'number' ? (Number.isInteger(valB) ? valB : valB.toFixed(2)) : valB}{unit}
                </span>
            </div>
            <div className="h-2 flex rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-l-full"
                    style={{ background: colorA }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pctA}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <motion.div
                    className="h-full rounded-r-full"
                    style={{ background: colorB }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pctB}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}
function PlayerSearch({
    side, player, search, setSearch, filtered, setPlayer
}: {
    side: 'A' | 'B';
    player: RankUser | null;
    search: string;
    setSearch: (v: string) => void;
    filtered: RankUser[];
    setPlayer: (p: RankUser) => void;
}) {
    const sideColor = side === 'A' ? '#3b82f6' : '#f97316';

    return (
        <div className="flex-1 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: sideColor }} />
                Jogador {side}
            </p>

            {player ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-3xl p-6 flex flex-col items-center gap-4 border text-center"
                    style={{
                        background: `${getTierColor(player.rating)}10`,
                        borderColor: `${getTierColor(player.rating)}40`,
                        boxShadow: `0 0 30px ${getTierColor(player.rating)}20`,
                    }}
                >
                    <button
                        onClick={() => { setPlayer(null as any); setSearch(''); }}
                        className="absolute top-3 right-3 w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full text-zinc-400 text-[10px] font-black transition-all"
                    >
                        ✕
                    </button>
                    <img
                        src={player.avatar}
                        alt={player.nickname}
                        className="w-16 h-16 rounded-full border-2"
                        style={{ borderColor: getTierColor(player.rating) }}
                    />
                    <div>
                        <Link href={`/player/${player.steamId}`}>
                            <h3 className="font-black italic uppercase tracking-tight text-lg hover:underline"
                                style={{ color: getTierColor(player.rating) }}
                            >
                                {player.nickname}
                            </h3>
                        </Link>
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">#{player.rank} no ranking</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <div className="bg-black/20 rounded-xl p-2 text-center">
                            <p className="text-[8px] text-zinc-600 font-black uppercase">SR Premier</p>
                            <p className="text-base font-black" style={{ color: getTierColor(player.rating) }}>
                                {player.rating > 0 ? player.rating.toLocaleString() : '—'}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-2 text-center">
                            <p className="text-[8px] text-zinc-600 font-black uppercase">Win Rate</p>
                            <p className="text-base font-black text-zinc-300">{player.winRate}</p>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                        type="text"
                        placeholder={`Buscar jogador ${side}...`}
                        className="w-full bg-zinc-950/70 border border-white/[0.07] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500/40 placeholder:text-zinc-700 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {filtered.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {filtered.slice(0, 5).map(p => (
                                <button
                                    key={p.steamId}
                                    onClick={() => { setPlayer(p); setSearch(''); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <img src={p.avatar} alt={p.nickname} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="font-bold text-sm text-white">{p.nickname}</p>
                                        <p className="text-[9px] text-zinc-600 font-bold uppercase">
                                            #{p.rank} • SR {p.rating > 0 ? p.rating.toLocaleString() : '—'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ComparePage() {
    const [players, setPlayers] = useState<RankUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchA, setSearchA] = useState('');
    const [searchB, setSearchB] = useState('');
    const [playerA, setPlayerA] = useState<RankUser | null>(null);
    const [playerB, setPlayerB] = useState<RankUser | null>(null);
    const [selectingFor, setSelectingFor] = useState<'A' | 'B' | null>(null);

    const [h2hData, setH2hData] = useState<any>(null);
    const [h2hLoading, setH2hLoading] = useState(false);

    useEffect(() => {
        if (playerA && playerB) {
            setH2hLoading(true);
            fetch(`/api/compare/h2h?steamIdA=${playerA.steamId}&steamIdB=${playerB.steamId}`)
                .then(r => r.json())
                .then(setH2hData)
                .catch(console.error)
                .finally(() => setH2hLoading(false));
        } else {
            setH2hData(null);
        }
    }, [playerA, playerB]);

    useEffect(() => {
        fetch('/api/ranking')
            .then(r => r.json())
            .then(d => {
                const list = d.players || d;
                if (Array.isArray(list)) setPlayers(list);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredA = useMemo(() =>
        searchA.length >= 2
            ? players.filter(p => p.nickname.toLowerCase().includes(searchA.toLowerCase()) && p.steamId !== playerB?.steamId)
            : [],
        [searchA, players, playerB]
    );

    const filteredB = useMemo(() =>
        searchB.length >= 2
            ? players.filter(p => p.nickname.toLowerCase().includes(searchB.toLowerCase()) && p.steamId !== playerA?.steamId)
            : [],
        [searchB, players, playerA]
    );

    const colorA = playerA ? getTierColor(playerA.rating) : '#3b82f6';
    const colorB = playerB ? getTierColor(playerB.rating) : '#f97316';

    const canCompare = playerA && playerB;

    // Win counter
    let winsA = 0;
    let winsB = 0;
    if (canCompare) {
        const stats = [
            { a: playerA.rating, b: playerB.rating },
            { a: playerA.kdr, b: playerB.kdr },
            { a: playerA.adr, b: playerB.adr },
            { a: playerA.hsPercentage, b: playerB.hsPercentage },
            { a: playerA.matchesPlayed, b: playerB.matchesPlayed },
            { a: playerA.gcLevel, b: playerB.gcLevel },
            { a: playerA.faceitLevel, b: playerB.faceitLevel },
        ];
        stats.forEach(s => { if (s.a > s.b) winsA++; else if (s.b > s.a) winsB++; });
    }

    return (
        <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">
            {/* Header */}
            <header className="relative flex flex-col gap-4 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -right-16 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
                        <Swords className="text-orange-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Head</span>
                            <span className="text-orange-400"> to Head</span>
                        </h1>
                        <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                            <span className="w-4 h-px bg-orange-500/40" />
                            Compare dois jogadores
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        </p>
                    </div>
                </div>
            </header>

            {/* Player Pickers */}
            <div className="relative flex flex-col md:flex-row gap-6 items-start">
                <PlayerSearch
                    side="A"
                    player={playerA}
                    search={searchA}
                    setSearch={setSearchA}
                    filtered={filteredA}
                    setPlayer={(p) => setPlayerA(p)}
                />

                {/* VS divider */}
                <div className="flex items-center justify-center md:self-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
                        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider">VS</span>
                    </div>
                </div>

                <PlayerSearch
                    side="B"
                    player={playerB}
                    search={searchB}
                    setSearch={setSearchB}
                    filtered={filteredB}
                    setPlayer={(p) => setPlayerB(p)}
                />
            </div>

            {/* Comparison Panel */}
            {canCompare && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Score Header */}
                    <div className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <img src={playerA.avatar} className="w-10 h-10 rounded-full border-2" style={{ borderColor: colorA }} alt={playerA.nickname} />
                                <div>
                                    <p className="font-black italic uppercase text-sm" style={{ color: colorA }}>{playerA.nickname}</p>
                                    <p className="text-[9px] text-zinc-600 font-bold">#{playerA.rank}</p>
                                </div>
                                <span className="text-3xl font-black italic ml-auto" style={{ color: winsA > winsB ? colorA : 'rgba(255,255,255,0.15)' }}>
                                    {winsA}
                                </span>
                            </div>

                            <div className="px-6 text-zinc-700 font-black text-sm uppercase tracking-widest">pts</div>

                            <div className="flex items-center gap-3 flex-1 flex-row-reverse">
                                <img src={playerB.avatar} className="w-10 h-10 rounded-full border-2" style={{ borderColor: colorB }} alt={playerB.nickname} />
                                <div className="text-right">
                                    <p className="font-black italic uppercase text-sm" style={{ color: colorB }}>{playerB.nickname}</p>
                                    <p className="text-[9px] text-zinc-600 font-bold">#{playerB.rank}</p>
                                </div>
                                <span className="text-3xl font-black italic mr-auto" style={{ color: winsB > winsA ? colorB : 'rgba(255,255,255,0.15)' }}>
                                    {winsB}
                                </span>
                            </div>
                        </div>

                        {(winsA !== winsB) && (
                            <p className="text-center text-[10px] font-black uppercase tracking-widest mt-4"
                                style={{ color: winsA > winsB ? colorA : colorB }}
                            >
                                🏆 {winsA > winsB ? playerA.nickname : playerB.nickname} está na frente!
                            </p>
                        )}
                        {winsA === winsB && winsA > 0 && (
                            <p className="text-center text-[10px] font-black uppercase tracking-widest mt-4 text-zinc-500">
                                ⚖️ Empate técnico!
                            </p>
                        )}
                    </div>

                    {/* Stats comparison bars */}
                    <div className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl p-6 backdrop-blur-xl space-y-5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <TrendingUp size={14} /> Comparação de Stats
                        </h2>

                        <StatBar labelA="SR Premier" labelB="SR Premier" valA={playerA.rating} valB={playerB.rating} colorA={colorA} colorB={colorB} />
                        <StatBar labelA="KDR" labelB="KDR" valA={playerA.kdr} valB={playerB.kdr} colorA={colorA} colorB={colorB} />
                        <StatBar labelA="ADR" labelB="ADR" valA={playerA.adr} valB={playerB.adr} colorA={colorA} colorB={colorB} />
                        <StatBar labelA="HS%" labelB="HS%" valA={playerA.hsPercentage} valB={playerB.hsPercentage} unit="%" colorA={colorA} colorB={colorB} />
                        <StatBar labelA="Partidas" labelB="Partidas" valA={playerA.matchesPlayed} valB={playerB.matchesPlayed} colorA={colorA} colorB={colorB} />
                        <StatBar labelA="GC Level" labelB="GC Level" valA={playerA.gcLevel} valB={playerB.gcLevel} colorA={colorA} colorB={colorB} />
                        <StatBar labelA="Faceit Lvl" labelB="Faceit Lvl" valA={playerA.faceitLevel} valB={playerB.faceitLevel} colorA={colorA} colorB={colorB} />
                    </div>

                    {/* Common Matches (H2H) */}
                    <div className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl p-6 backdrop-blur-xl space-y-5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Users size={14} /> Histórico em Comum
                        </h2>
                        
                        {h2hLoading ? (
                            <div className="flex justify-center py-6">
                                <RefreshCw className="animate-spin text-zinc-600" size={24} />
                            </div>
                        ) : h2hData && h2hData.totalCommon > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <div className="text-center flex-1">
                                        <p className="text-2xl font-black" style={{ color: h2hData.winsA > h2hData.winsB ? colorA : (h2hData.winsA === h2hData.winsB ? '#fff' : 'rgba(255,255,255,0.3)') }}>{h2hData.winsA}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Mais Ponto$</p>
                                    </div>
                                    <div className="text-center px-4">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{h2hData.totalCommon} Partidas</p>
                                        <p className="text-[8px] text-zinc-600 mt-1 uppercase font-bold">Na mesma sala</p>
                                    </div>
                                    <div className="text-center flex-1">
                                        <p className="text-2xl font-black" style={{ color: h2hData.winsB > h2hData.winsA ? colorB : (h2hData.winsA === h2hData.winsB ? '#fff' : 'rgba(255,255,255,0.3)') }}>{h2hData.winsB}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Mais Ponto$</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {h2hData.matches.map((m: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                                            <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                <span>{new Date(m.date).toLocaleDateString()} • {m.map}</span>
                                                <span className={m.isSameTeam ? "text-blue-400" : "text-red-400"}>
                                                    {m.isSameTeam ? "Mesmo Time" : "Adversários"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black w-6" style={{ color: m.betterPlacedSteamId === playerA.steamId ? colorA : 'rgba(255,255,255,0.3)' }}>
                                                        {m.playerA.score}
                                                    </span>
                                                    <span className="text-zinc-400 text-[9px]">{m.playerA.kills}K - {m.playerA.deaths}D</span>
                                                </div>
                                                <span className="text-[9px] text-zinc-600 font-black">VS</span>
                                                <div className="flex items-center gap-2 flex-row-reverse">
                                                    <span className="font-black w-6 text-right" style={{ color: m.betterPlacedSteamId === playerB.steamId ? colorB : 'rgba(255,255,255,0.3)' }}>
                                                        {m.playerB.score}
                                                    </span>
                                                    <span className="text-zinc-400 text-[9px]">{m.playerB.kills}K - {m.playerB.deaths}D</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                                Eles nunca jogaram na mesma partida cadastrada.
                            </div>
                        )}
                    </div>

                    {/* Quick links */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { player: playerA, color: colorA },
                            { player: playerB, color: colorB },
                        ].map(({ player, color }) => (
                            <Link
                                key={player.steamId}
                                href={`/player/${player.steamId}`}
                                className="flex items-center gap-3 bg-zinc-950/60 border border-white/[0.07] rounded-2xl p-4 hover:bg-white/[0.03] transition-all group"
                            >
                                <img src={player.avatar} className="w-8 h-8 rounded-full" alt={player.nickname} />
                                <span className="font-black text-sm text-zinc-400 group-hover:text-white transition-colors">
                                    Ver perfil de {player.nickname}
                                </span>
                                <span className="ml-auto text-[10px]" style={{ color }}>→</span>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Empty state */}
            {!canCompare && !loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <Swords size={32} className="text-orange-400/50" />
                    </div>
                    <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">
                        Selecione dois jogadores para comparar
                    </p>
                    <p className="text-zinc-700 text-xs max-w-xs">
                        Digite pelo menos 2 letras do nick para buscar. Os dados vêm direto do ranking da tropa.
                    </p>
                </div>
            )}
        </div>
    );
}
