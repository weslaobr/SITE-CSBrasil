"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Target, Crosshair, Swords, ExternalLink, Activity, Clock, Star, Zap } from 'lucide-react';
import { getMixLevelFromPoints } from '@/lib/mix-level';

interface ProfileSidebarProps {
    profile: any;
    steamStats: any;
    inventoryValueStr: string;
    steamLevel: number;
    medals: any[];
    leetifyData: any;
    playerStats?: any;
}

const PREMIER_TIERS = [
    { name: 'Gray',       min: 0,     max: 4999,     color: '#8a9ba8' },
    { name: 'Light Blue', min: 5000,  max: 9999,     color: '#4fc3f7' },
    { name: 'Blue',       min: 10000, max: 14999,    color: '#2962ff' },
    { name: 'Purple',     min: 15000, max: 19999,    color: '#9c27b0' },
    { name: 'Pink',       min: 20000, max: 24999,    color: '#e91e8c' },
    { name: 'Red',        min: 25000, max: 29999,    color: '#d32f2f' },
    { name: 'Gold',       min: 30000, max: Infinity, color: '#f5c518' },
] as const;

function getPremierTier(rating: number) {
    if (!rating || rating <= 0) return PREMIER_TIERS[0];
    return PREMIER_TIERS.find(t => rating >= t.min && rating <= t.max) ?? PREMIER_TIERS[PREMIER_TIERS.length - 1];
}

function getMMRank(rankId: number, type: 'matchmaking' | 'wingman' = 'matchmaking') {
    if (rankId < 0 || rankId > 18) return { name: "Unranked", icon: null };
    const names = [
        "Unranked", "Prata I", "Prata II", "Prata III", "Prata IV", "Prata Elite", "Prata Mestre",
        "Ouro I", "Ouro II", "Ouro III", "Ouro Mestre",
        "AK I", "AK II", "AK Cruzada", "Xerife",
        "Águia I", "Águia Mestre", "Supremo", "Global Elite"
    ];
    return { name: names[rankId], icon: `https://raw.githubusercontent.com/ItzArty/csgo-rank-icons/main/${type}/${rankId}.svg` };
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profile, steamStats, inventoryValueStr, steamLevel, medals, leetifyData, playerStats }) => {
    const premierRating = playerStats?.premierRating || steamStats?.premier_rating || leetifyData?.ranks?.premier || 0;
    const tier = getPremierTier(premierRating);
    const maxCompRankId = playerStats?.maxCompetitiveRank || leetifyData?.ranks?.matchmaking || 0;
    const maxCompRank = getMMRank(maxCompRankId);
    const wingmanRankId = leetifyData?.ranks?.wingmanElo || 0;
    const wingmanRank = getMMRank(wingmanRankId, 'wingman');
    const faceitLevel = playerStats?.faceitLevel || leetifyData?.ranks?.faceitLevel || 0;
    const faceitElo = playerStats?.faceitElo || leetifyData?.ranks?.faceitElo || 0;
    const faceitNickname = playerStats?.faceitName || null;
    const joinedDate = profile.timecreated
        ? new Date(profile.timecreated * 1000).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

    const pts = playerStats?.rankingPoints || 500;
    const lvl = getMixLevelFromPoints(pts);
    const totalHoursPlayed = Math.floor((steamStats?.total_time_played || 0) / 3600);

    return (
        <div className="space-y-5 h-full flex flex-col">
            {/* ── HERO CARD ── */}
            <div className="relative overflow-hidden bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 rounded-[32px] border border-white/5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

                {/* Avatar Section */}
                <div className="relative pt-10 pb-6 px-6 text-center">
                    <div className="relative inline-block mb-4">
                        <div className="absolute -inset-1.5 bg-gradient-to-br from-yellow-500/40 via-yellow-500/10 to-transparent rounded-[24px] blur-sm" />
                        <motion.img
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={profile.avatarfull}
                            alt={profile.personaname}
                            className="relative w-36 h-36 rounded-[24px] border-2 border-zinc-700/50 object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-[3px] border-zinc-900" />
                    </div>

                    <h2 className="text-xl font-black italic tracking-tighter text-white">{profile.personaname}</h2>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${profile.personaState === 1 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {profile.personaState === 1 ? '● Online' : '○ Offline'}
                        </span>
                        <span className="text-zinc-700">|</span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{joinedDate}</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-px bg-white/5">
                    <div className="bg-zinc-900/80 py-3 px-3 text-center">
                        <p className="text-xs font-black text-white italic">{totalHoursPlayed.toLocaleString()}</p>
                        <p className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">Horas CS</p>
                    </div>
                    <div className="bg-zinc-900/80 py-3 px-3 text-center">
                        <p className="text-xs font-black text-white italic">{steamLevel}</p>
                        <p className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">Nível Steam</p>
                    </div>
                    <div className="bg-zinc-900/80 py-3 px-3 text-center">
                        <p className="text-xs font-black text-white italic">{inventoryValueStr}</p>
                        <p className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">Inventário</p>
                    </div>
                </div>

                {/* Profile Links */}
                <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-white/5 flex-wrap">
                    <ProfileLink href={`https://steamcommunity.com/profiles/${profile.steamid}`} icon="/img/icone-steam.png" title="Steam" />
                    <ProfileLink href={`https://leetify.com/app/profile/${profile.steamid}`} icon="/img/icone-leetify.png" title="Leetify" />
                    <ProfileLink href={faceitNickname ? `https://www.faceit.com/en/players/${faceitNickname}` : `https://www.faceit.com/en/players/${profile.personaname}`} icon="/img/icone-faceit.png" title="FACEIT" />
                    <ProfileLink href={`https://gamersclub.gg/jogador/${playerStats?.gcNickname || profile.steamid}`} icon="/img/icone-gamersclub.png" title="GC" />
                    <ProfileLink href={`https://csstats.gg/player/${profile.steamid}`} icon="/img/icone-csstats.png" title="CSStats" />
                    <ProfileLink href={`https://csrep.gg/player/${profile.steamid}`} icon="/img/icone-csrep.png" title="CSRep" />
                </div>
            </div>

            {/* ── MIX RANKING ── */}
            <div
                className="relative overflow-hidden rounded-[24px] border p-5 transition-all group"
                style={{
                    background: `linear-gradient(135deg, ${lvl.color}15 0%, transparent 100%)`,
                    borderColor: `${lvl.color}30`,
                }}
            >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: `${lvl.color}08`, filter: 'blur(60px)' }} />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full" style={{ background: lvl.color }} />
                            <span className="text-[8px] font-black uppercase tracking-[0.15em]" style={{ color: lvl.color }}>Mix Ranking</span>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                            {lvl.label}
                        </span>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-xl bg-zinc-900 border-2 flex items-center justify-center"
                                style={{ borderColor: `${lvl.color}50` }}>
                                <span className="text-2xl font-black italic" style={{ color: lvl.color }}>{lvl.level}</span>
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 text-[7px] font-black px-1 py-0.5 rounded text-black"
                                style={{ background: lvl.color }}>LV</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black italic text-white">{pts.toLocaleString('pt-BR')}</span>
                                <span className="text-[8px] font-bold italic uppercase tracking-widest" style={{ color: lvl.color }}>TP</span>
                            </div>
                            <div className="mt-2 w-full h-1 bg-black/40 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${lvl.progress}%` }}
                                    className="h-full rounded-full"
                                    style={{ background: `linear-gradient(90deg, ${lvl.color}80, ${lvl.color})` }}
                                />
                            </div>
                            <p className="text-[7px] text-zinc-600 font-bold mt-1 uppercase tracking-widest">
                                {lvl.pointsToNext != null ? `+${lvl.pointsToNext} pts para LV${lvl.level + 1}` : 'Nível Máximo'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PREMIER & RANKS ── */}
            <div className="grid grid-cols-2 gap-3">
                <RankCard
                    icon={<Trophy size={14} />}
                    label="Premier"
                    value={premierRating > 0 ? premierRating.toLocaleString('pt-BR') : '—'}
                    sublabel={premierRating > 0 ? tier.name : 'Sem rating'}
                    color={tier.color}
                    glow
                />
                <RankCard
                    icon={<Crosshair size={14} />}
                    label="Competitivo"
                    value={maxCompRank.name}
                    sublabel="Máximo"
                    color="#38bdf8"
                />
                <RankCard
                    icon={<Swords size={14} />}
                    label="Braço Direito"
                    value={wingmanRank.name}
                    sublabel="Wingman"
                    color="#34d399"
                />
                <RankCard
                    icon={<Star size={14} />}
                    label="FACEIT"
                    value={faceitLevel > 0 ? `Level ${faceitLevel}` : '—'}
                    sublabel={faceitElo > 0 ? `${faceitElo.toLocaleString()} ELO` : 'Sem dados'}
                    color="#ff5500"
                />
            </div>

            {/* ── BOTTOM RANKS (GC + Premiere Rank Icons) ── */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-4 text-center group hover:bg-zinc-900/60 transition-all">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1">GamersClub</p>
                    <div className="flex items-center justify-center gap-2">
                        <img src="/img/icone-gamersclub.png" className="w-7 h-7 object-contain brightness-125" alt="GC" />
                        <span className="text-lg font-black text-[#FFCC00] italic">{playerStats?.gcLevel || 'N/A'}</span>
                    </div>
                </div>
                {maxCompRank.icon && (
                    <div className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-3 flex items-center justify-center group hover:bg-zinc-900/60 transition-all">
                        <img src={maxCompRank.icon} alt={maxCompRank.name} className="h-16 w-auto object-contain drop-shadow-lg group-hover:scale-110 transition-transform" />
                    </div>
                )}
            </div>

            {/* ── GAMERSCLUB + FACEIT ── */}
            <div className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-4 group hover:bg-zinc-900/60 transition-all">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2">FACEIT</p>
                <div className="flex items-center justify-center gap-3">
                    {faceitLevel > 0 && (
                        <img src={`/img/icone-faceit-level-${String(faceitLevel).padStart(2, '0')}.png`}
                            className="w-12 h-12 object-contain drop-shadow-xl group-hover:scale-110 transition-transform" alt={`Lv ${faceitLevel}`} />
                    )}
                    <div className="text-left">
                        <span className="text-xl font-black italic text-white">{faceitElo > 0 ? faceitElo.toLocaleString('pt-BR') : '—'}</span>
                        <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest block">ELO</span>
                    </div>
                </div>
            </div>

            {/* ── MEDALS ── */}
            <div className="bg-zinc-900/40 rounded-[20px] border border-white/5 p-3 flex-1">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[7px] font-black uppercase tracking-widest text-zinc-500">Medalhas</h3>
                    <span className="text-[6px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md font-black uppercase">{medals.length}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {medals.length > 0 ? medals.slice(0, 16).map((medal: any, i: number) => (
                        <div key={i} className="aspect-square bg-zinc-950/50 rounded-lg border border-white/[0.04] p-1 flex items-center justify-center group hover:border-yellow-500/30 transition-all cursor-help" title={medal.name}>
                            <img src={medal.icon_url} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt={medal.name} />
                        </div>
                    )) : (
                        <div className="col-span-4 py-4 flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/30 rounded-xl border border-white/5">
                            <span className="text-[7px] font-black uppercase tracking-widest">Vazio</span>
                            <span className="text-[6px] font-bold mt-0.5 tracking-widest">(Inv. privado)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── REPORT ── */}
            <button className="w-full py-3.5 bg-red-500/5 hover:bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-red-500/10 hover:border-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <Shield size={12} /> Reportar Jogador
            </button>
        </div>
    );
};

function ProfileLink({ href, icon, title }: { href: string; icon: string; title: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/5 flex items-center justify-center transition-all hover:scale-110 group"
            title={title}>
            <img src={icon} className="w-4 h-4 object-contain opacity-60 group-hover:opacity-100 transition-opacity" alt={title} />
        </a>
    );
}

function RankCard({ icon, label, value, sublabel, color, glow }: {
    icon: React.ReactNode; label: string; value: string; sublabel: string; color: string; glow?: boolean;
}) {
    return (
        <div className="relative overflow-hidden rounded-[20px] border p-4 text-center transition-all group hover:scale-[1.02]"
            style={{
                background: `${color}08`,
                borderColor: `${color}20`,
                boxShadow: glow ? `0 0 20px ${color}10` : 'none',
            }}>
            {glow && <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 50%, ${color}15, transparent 70%)` }} />}
            <div className="relative z-10">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <span style={{ color }}>{icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${color}cc` }}>{label}</span>
                </div>
                <p className="text-sm font-black italic tracking-tight text-white">{value}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5" style={{ color: `${color}99` }}>{sublabel}</p>
            </div>
        </div>
    );
}

export default ProfileSidebar;
