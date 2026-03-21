"use client";

import Link from 'next/link';
import { Search, Globe, Shield } from 'lucide-react';

export default function TropaCSHeader() {
    return (
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-10">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-64 h-20 flex items-center justify-center transition-transform">
                        <img
                            src="/img/logotipo-tropacs-retangular-pequeno.png"
                            alt="TropaCS Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <Link href="/" className="hover:text-yellow-500 transition-colors">Dashboard</Link>
                    <Link href="#" className="hover:text-yellow-500 transition-colors">Pro Players</Link>
                    <Link href="#" className="hover:text-yellow-500 transition-colors">Global Leaderboard</Link>
                </nav>
            </div >

            <div className="flex items-center gap-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-hover:text-yellow-500 transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="BUSCAR PLAYER..."
                        className="bg-white/5 border border-white/5 rounded-full py-2.5 pl-10 pr-6 text-[10px] font-bold tracking-widest text-white focus:outline-none focus:border-yellow-500/50 w-64 transition-all"
                    />
                </div>
                <div className="w-10 h-10 bg-white/5 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <Globe size={16} />
                </div>
            </div>
        </header >
    );
}
