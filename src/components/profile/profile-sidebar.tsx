"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Award, Shield, MessageCircle } from 'lucide-react';

interface ProfileSidebarProps {
    profile: any;
    steamStats: any;
    inventoryValue: number;
    steamLevel: number;
    medals: any[];
    leetifyData: any;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profile, steamStats, inventoryValue, steamLevel, medals, leetifyData }) => {
    const joinedDate = profile.timecreated 
        ? new Date(profile.timecreated * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

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

                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{profile.personaname}</h2>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Joined Steam: {joinedDate}</p>
                        <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-2">{profile.personaState === 1 ? 'Online' : 'Offline'}</p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-6 pb-2 border-t border-white/5">
                        <div className="w-10 h-10 bg-zinc-950/80 rounded-[14px] flex items-center justify-center border border-white/5 hover:bg-zinc-800 transition-colors cursor-help" title="Steam">
                             <img src="/icons/steam-bw.svg" className="w-5 h-5 opacity-70" alt="Steam" />
                             {!medals.length && <span className="text-[10px] font-black text-white">S</span>}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-[14px] flex items-center justify-center border border-blue-500/20 hover:border-blue-500/50 transition-colors cursor-help" title="CS2">
                            <span className="text-[10px] font-black text-blue-400 italic">CS</span>
                        </div>
                        <div className="w-10 h-10 bg-[#FF5500]/10 rounded-[14px] flex items-center justify-center border border-[#FF5500]/20 hover:border-[#FF5500]/50 transition-colors cursor-help" title="Leetify">
                            <span className="text-[10px] font-black text-[#FF5500]">L</span>
                        </div>
                        <div className={`w-10 h-10 ${leetifyData?.ranks?.faceitLevel ? 'bg-orange-600/20 border-orange-500/30 text-orange-500 hover:border-orange-500/60' : 'bg-zinc-950/80 border-white/5 text-zinc-600'} rounded-[14px] border flex items-center justify-center transition-colors cursor-help`} title="FACEIT">
                            <span className="text-[10px] font-black">F</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Playtime</p>
                            <p className="text-sm font-black text-white italic">{(steamStats?.total_time_played / 3600).toFixed(0).toLocaleString()} hrs</p>
                        </div>
                        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Inventory</p>
                            <p className="text-sm font-black text-white italic">${Math.round(inventoryValue).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 text-center">
                            <p className="text-[9px] text-emerald-500/60 uppercase font-black italic tracking-widest mb-1">Premier</p>
                            <p className="text-base font-black text-emerald-500 italic uppercase">{steamStats?.premier_rating || leetifyData?.ranks?.premier || 'N/A'}</p>
                        </div>
                        <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/10 text-center">
                            <p className="text-[9px] text-orange-500/60 uppercase font-black italic tracking-widest mb-1">Elo FACEIT</p>
                            <p className="text-base font-black text-orange-500 italic uppercase">{leetifyData?.ranks?.faceitElo || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Medals/Badges */}
            <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 flex-1">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Medals & Badges</h3>
                    <span className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-black uppercase">Show All ({medals.length})</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                    {medals.length > 0 ? medals.slice(0, 12).map((medal, i) => (
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
                    {/* Commendations and Reputation removed because they cannot be reliably fetched via standard Steam web APIs */}
                    
                    <button className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all active:scale-95 shadow-sm shadow-red-500/5">
                        <span className="flex items-center justify-center gap-2">Reportar Jogador</span>
                    </button>
                    
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest text-center mt-4 flex items-center justify-center gap-2 italic">
                        Dados atualizados via Steam & Leetify
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileSidebar;
