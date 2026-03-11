"use client";

import Link from 'next/link';
import { Search, Globe, Shield } from 'lucide-react';

export default function CSBrasilHeader() {
    return (
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-10">
                <Link href="/csbrasil" className="flex items-center gap-3 group">
                    <div className="w-40 h-14 rounded-xl flex items-center justify-center transition-transform">
                        <img
                            src="/img/logo.png"
                            alt="CSBrasil Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">
                    <Link href="/csbrasil" className="hover:text-green-500 transition-colors">Dashboard</Link>
                    <Link href="#" className="hover:text-green-500 transition-colors">Pro Players</Link>
                    <Link href="#" className="hover:text-green-500 transition-colors">Global Leaderboard</Link>
                </nav>
            </div >

            <div className="flex items-center gap-4">
                <div className="relative group hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-hover:text-green-500 transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="BUSCAR JOGADOR..."
                        className="bg-white/5 border border-white/5 rounded-full py-2.5 pl-10 pr-6 text-[10px] font-bold tracking-widest text-white focus:outline-none focus:border-green-500/50 w-64 transition-all"
                    />
                </div>
                <div className="w-10 h-10 bg-white/5 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <Globe size={16} />
                </div>
            </div>
        </header >
    );
}
