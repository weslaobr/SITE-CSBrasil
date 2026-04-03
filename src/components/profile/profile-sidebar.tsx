"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface ProfileSidebarProps {
    profile: any;
    steamStats: any;
    inventoryValueStr: string;
    steamLevel: number;
    medals: any[];
    leetifyData: any;
    playerStats?: any;
}

const getMMRank = (rankId: number) => {
    if (!rankId || rankId < 1 || rankId > 18) return { name: "Unranked", icon: null };
    const names = [
        "",
        "Prata I", "Prata II", "Prata III", "Prata IV", "Prata de Elite", "Prata Mestre",
        "Ouro I", "Ouro II", "Ouro III", "Ouro Mestre",
        "Mestre Guardião I", "Mestre Guardião II", "Mestre Guardião Elite", "Distinto Mestre Guardião",
        "Águia Lendária", "Águia Lendária Mestre",
        "Mestre Supremo", "A Global Elite"
    ];
    return {
        name: names[rankId],
        icon: `https://steamcdn-a.akamaihd.net/apps/730/icons/econ/status_icons/skillgroup${rankId}.png`
    };
};

// ── CS2 PREMIER TIER SYSTEM — idêntico ao global-ranking.tsx ─────────────────
const PREMIER_TIERS = [
    { name: 'Gray',       min: 0,     max: 4999,     color: '#8a9ba8', textColor: '#8a9ba8' },
    { name: 'Light Blue', min: 5000,  max: 9999,     color: '#4fc3f7', textColor: '#4fc3f7' },
    { name: 'Blue',       min: 10000, max: 14999,    color: '#2962ff', textColor: '#6b8fff' },
    { name: 'Purple',     min: 15000, max: 19999,    color: '#9c27b0', textColor: '#ce93d8' },
    { name: 'Pink',       min: 20000, max: 24999,    color: '#e91e8c', textColor: '#f06292' },
    { name: 'Red',        min: 25000, max: 29999,    color: '#d32f2f', textColor: '#ef9a9a' },
    { name: 'Gold',       min: 30000, max: Infinity, color: '#f5c518', textColor: '#f5c518' },
] as const;

function getPremierTier(rating: number) {
    if (!rating || rating <= 0) return PREMIER_TIERS[0];
    return PREMIER_TIERS.find(t => rating >= t.min && rating <= t.max) ?? PREMIER_TIERS[PREMIER_TIERS.length - 1];
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profile, steamStats, inventoryValueStr, steamLevel, medals, leetifyData, playerStats }) => {
    const joinedDate = profile.timecreated
        ? new Date(profile.timecreated * 1000).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

    const mmRank = getMMRank(leetifyData?.ranks?.matchmaking || 0);

    // Premier Rating — prioridade: DB > cs2space (já dentro de playerStats) > leetifyData
    const premierRating = playerStats?.premierRating
        || steamStats?.premier_rating
        || leetifyData?.ranks?.premier
        || 0;

    const tier = getPremierTier(premierRating);

    // FACEIT: usa nickname real do DB/CS2Space, com fallback para personaname
    const faceitNickname = playerStats?.faceitName || null;
    const faceitLink = faceitNickname
        ? `https://www.faceit.com/en/players/${faceitNickname}`
        : `https://www.faceit.com/en/players/${profile.personaname}`;

    // GamersClub: URL usa steamId64
    const gcSteamId = playerStats?.gcNickname || profile.steamid;
    const gcLink = `https://gamersclub.gg/jogador/${gcSteamId}`;

    // FACEIT level/elo — prioridade: DB (playerStats) > leetifyData?.ranks
    const faceitLevel = playerStats?.faceitLevel || leetifyData?.ranks?.faceitLevel || 0;
    const faceitElo   = playerStats?.faceitElo   || leetifyData?.ranks?.faceitElo   || 0;

    return (
        <div className="space-y-8 h-full flex flex-col">
            {/* Main Header / Info */}
            <div className="bg-zinc-900/60 rounded-[40px] border border-white/5 p-6 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-white text-[10px] font-black shadow-lg">
                        {steamLevel}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Avatar */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <motion.img
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={profile.avatarfull}
                                alt={profile.personaname}
                                className="w-48 h-48 rounded-[48px] border-4 border-zinc-800 shadow-2xl relative z-10 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                            />
                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-sky-500 rounded-full border-4 border-zinc-900 z-20" />
                        </div>
                    </div>

                    {/* Name / status */}
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{profile.personaname}</h2>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entrou na Steam: {joinedDate}</p>
                        <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-2">
                            {profile.personaState === 1 ? 'Online' : 'Offline'}
                        </p>
                    </div>

                    {/* Profile links */}
                    <div className="flex items-center justify-center gap-2 pt-6 pb-2 border-t border-white/5 flex-wrap">
                        <a href={`https://steamcommunity.com/profiles/${profile.steamid}`} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-zinc-950/80 rounded-[12px] flex items-center justify-center border border-white/5 hover:bg-zinc-800 transition-colors" title="Steam Community">
                            <img src="/img/icone-steam.png" className="w-5 h-5 object-contain opacity-80" alt="Steam" />
                        </a>
                        <a href={`https://csstats.gg/player/${profile.steamid}`} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-blue-600/10 rounded-[12px] flex items-center justify-center border border-blue-500/20 hover:border-blue-500/50 transition-colors" title="CS-Stats">
                            <img src="/img/icone-csstats.png" className="w-5 h-5 object-contain" alt="CS-Stats" />
                        </a>
                        <a href={`https://leetify.com/app/profile/${profile.steamid}`} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-[#FF5500]/10 rounded-[12px] flex items-center justify-center border border-[#FF5500]/20 hover:border-[#FF5500]/50 transition-colors" title="Leetify">
                            <img src="/img/icone-leetify.png" className="w-5 h-5 object-contain" alt="Leetify" />
                        </a>
                        {/* FACEIT — link usa nick real do banco */}
                        <a href={faceitLink} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-[#FF5500]/10 rounded-[12px] flex items-center justify-center border border-[#FF5500]/20 hover:border-[#FF5500]/50 transition-colors"
                           title={faceitNickname ? `FACEIT: ${faceitNickname}` : 'FACEIT'}>
                            <img src="/img/icone-faceit.png" className="w-5 h-5 object-contain" alt="FACEIT" />
                        </a>
                        {/* Gamers Club — link usa steamId64 */}
                        <a href={gcLink} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-cyan-600/10 rounded-[12px] flex items-center justify-center border border-cyan-500/20 hover:border-cyan-500/50 transition-colors" title="Gamers Club">
                            <img src="/img/icone-gamersclub.png" className="w-5 h-5 object-contain" alt="Gamers Club" />
                        </a>
                        <a href={`https://csrep.gg/player/${profile.steamid}`} target="_blank" rel="noopener noreferrer"
                           className="w-9 h-9 bg-yellow-600/10 rounded-[12px] flex items-center justify-center border border-yellow-500/20 hover:border-yellow-500/50 transition-colors" title="CS-Rep">
                            <img src="/img/icone-csrep.png" className="w-5 h-5 object-contain font-black" alt="CS-Rep" />
                        </a>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Tempo de Jogo</p>
                            <p className="text-sm font-black text-white italic">{(steamStats?.total_time_played / 3600).toFixed(0).toLocaleString()} h</p>
                        </div>
                        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Inventário</p>
                            <p className="text-sm font-black text-white italic">{inventoryValueStr}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* ── Premier Rating — sistema de cores idêntico ao ranking ── */}
                        <div
                            className="col-span-2 p-4 rounded-2xl border text-center flex flex-col justify-center group transition-all"
                            style={{
                                background: `${tier.color}12`,
                                borderColor: `${tier.color}40`,
                                boxShadow: premierRating > 0 ? `0 0 18px ${tier.color}20` : 'none',
                            }}
                        >
                            {/* Header: label + badge "Máximo" */}
                            <div className="flex items-center justify-between mb-2">
                                <p
                                    className="text-[9px] uppercase font-black italic tracking-widest leading-none"
                                    style={{ color: tier.textColor }}
                                >
                                    Premier Rating
                                </p>
                                <span
                                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                                    style={{
                                        color: tier.textColor,
                                        borderColor: `${tier.color}40`,
                                        background: `${tier.color}15`,
                                    }}
                                >
                                    Máximo
                                </span>
                            </div>

                            {/* Rating value */}
                            <div className="flex items-center justify-center gap-2">
                                <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: tier.textColor }} />
                                <span
                                    className="text-2xl font-black italic uppercase leading-none tracking-tighter"
                                    style={{
                                        color: tier.textColor,
                                        textShadow: premierRating > 0 ? `0 0 16px ${tier.color}80` : 'none',
                                    }}
                                >
                                    {premierRating > 0 ? premierRating.toLocaleString('pt-BR') : '—'}
                                </span>
                                {premierRating > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span
                                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ background: tier.color, boxShadow: `0 0 6px ${tier.color}` }}
                                        />
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest"
                                            style={{ color: tier.textColor, opacity: 0.7 }}
                                        >
                                            {tier.name}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Competitivo clássico */}
                        <div className="bg-sky-500/10 p-4 rounded-2xl border border-sky-500/10 text-center flex flex-col items-center justify-center group hover:bg-sky-500/15 transition-all">
                            <p className="text-[9px] text-sky-500/60 uppercase font-black italic tracking-widest mb-1 leading-none">Competitivo</p>
                            {mmRank.icon ? (
                                <img src={mmRank.icon} alt={mmRank.name} className="h-7 mt-1 object-contain drop-shadow-lg scale-110 group-hover:scale-125 transition-transform" title={mmRank.name} />
                            ) : (
                                <p className="text-[10px] mt-1 font-black text-sky-500 italic uppercase">Unranked</p>
                            )}
                        </div>

                        {/* GamersClub */}
                        <div className="bg-[#FFCC00]/10 p-4 rounded-2xl border border-[#FFCC00]/10 text-center flex flex-col justify-center group hover:bg-[#FFCC00]/15 transition-all">
                            <p className="text-[9px] text-[#FFCC00]/60 uppercase font-black italic tracking-widest mb-1 leading-none">GamersClub</p>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                <img src="/img/icone-gamersclub.png" className="w-4 h-4 object-contain brightness-125" alt="GC" />
                                <p className="text-lg font-black text-[#FFCC00] italic uppercase leading-none">
                                    {playerStats?.gcLevel || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* FACEIT */}
                        <div className="bg-[#ff5500]/10 p-4 rounded-2xl border border-[#ff5500]/20 text-center flex flex-col justify-center group hover:bg-[#ff5500]/15 transition-all col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] text-[#ff5500]/60 uppercase font-black italic tracking-widest leading-none">Nível Faceit</p>
                                {faceitNickname && (
                                    <span className="text-[8px] text-[#ff5500]/50 font-black tracking-widest truncate max-w-[110px]">
                                        @{faceitNickname}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                {faceitLevel > 0 ? (
                                    <>
                                        <img
                                            src={`https://faceit-ranking.eu/img/levels/${faceitLevel}.png`}
                                            className="w-6 h-6 object-contain drop-shadow-md group-hover:scale-125 transition-transform"
                                            alt={`Faceit ${faceitLevel}`}
                                        />
                                        <p className="text-xl font-black text-white italic tracking-tighter leading-none">
                                            {faceitElo > 0 ? faceitElo.toLocaleString() : `Nível ${faceitLevel}`}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-base font-black text-[#ff5500] italic uppercase">N/A</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Medals/Badges */}
            <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 flex-1">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Medalhas e Insígnias</h3>
                    <span className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-black uppercase">Ver Todas ({medals.length})</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {medals.length > 0 ? medals.slice(0, 12).map((medal: any, i: number) => (
                        <div key={i} className="aspect-square bg-zinc-950/50 rounded-xl border border-white/5 p-2 flex items-center justify-center group hover:border-yellow-500/30 transition-all cursor-help relative" title={medal.name}>
                            <img src={medal.icon_url} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt={medal.name} />
                        </div>
                    )) : (
                        <div className="col-span-4 py-8 flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/30 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma Medalha Encontrada</span>
                            <span className="text-[8px] font-bold mt-1 tracking-widest">(Ou inventário privado)</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-4">
                    <button className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all active:scale-95 shadow-sm shadow-red-500/5">
                        <span className="flex items-center justify-center gap-2">Reportar Jogador</span>
                    </button>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest text-center mt-4 flex items-center justify-center gap-2 italic">
                        Dados atualizados via Steam &amp; Leetify
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileSidebar;
