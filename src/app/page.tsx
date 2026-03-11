"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Zap, Shield, BarChart3, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CSBrasilHome() {
  const [steamId, setSteamId] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (steamId.trim()) {
      router.push(`/player/${steamId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen selection:bg-green-500 selection:text-black">
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-8 overflow-hidden">
          {/* Background Grid/Glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-green-500/5 rounded-full blur-[120px]" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-white">ELEVE SEU </span>
                <span className="text-green-500">JOGO</span>
              </h1>
              <p className="mt-6 text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs md:text-sm">
                Deep Analytics & Performance Insights para o CS2 Brasileiro
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-2xl mx-auto group"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-2 pl-6 shadow-2xl">
                <Search className="text-zinc-600" size={20} />
                <input
                  type="text"
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  placeholder="DIGITE SEU STEAMID64 (ex: 76561198024691636)"
                  className="flex-1 bg-transparent border-none focus:outline-none px-4 font-bold text-white uppercase italic tracking-wider text-sm placeholder:text-zinc-700"
                />
                <button className="bg-green-500 hover:bg-green-400 text-black font-black uppercase italic tracking-tighter px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95">
                  ANALISAR
                </button>
              </div>
            </motion.form>

            <div className="flex flex-wrap justify-center gap-12 pt-12">
              <div className="text-center">
                <p className="text-3xl font-black italic text-white leading-none">V3</p>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-2">API PUBLIC</p>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-black italic text-white leading-none">1.2ms</p>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-2">LATENCY</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Shield size={24} />, title: "IA ANTI-CHEAT", desc: "Algoritmos avançados que validam a integridade de cada pick e estatística." },
            { icon: <BarChart3 size={24} />, title: "PROFESSIONAL RADAR", desc: "Compare seu estilo de jogo com os maiores IGLs e Entry Fraggers do país." },
            { icon: <Users size={24} />, title: "SCOUTING TOOL", desc: "A ferramenta definitiva para times amadores encontrarem talentos ocultos." }
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900/40 border border-white/5 p-10 rounded-[40px] hover:bg-zinc-900/60 transition-colors group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-black italic uppercase text-white mb-3 tracking-tight">{f.title}</h3>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="p-20 text-center border-t border-white/5 mt-20">
        <div className="flex justify-center gap-10 mb-8 opacity-20 filter grayscale">
          <Shield size={32} />
          <Zap size={32} />
          <Trophy size={32} />
        </div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">CSBRASIL © 2026 • TODOS OS DIREITOS RESERVADOS</p>
      </footer>
    </div>
  );
}
