"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Search, Trophy, Zap, Shield, BarChart3, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TropaCSHome() {
  const { data: session, status } = useSession();
  const [steamId, setSteamId] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (steamId.trim()) {
      router.push(`/player/${steamId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen selection:bg-yellow-500 selection:text-black">
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-8 overflow-hidden">
          {/* Background Grid/Glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-yellow-500/5 rounded-full blur-[120px]" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-white">ELEVE SEU </span>
                <span className="text-yellow-500">JOGO</span>
              </h1>
              <p className="mt-6 text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs md:text-sm">
                Análise Profunda & Insights de Performance para a Tropa do CS2 Brasileiro
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-xl mx-auto group mt-8"
            >
              <div className="absolute inset-0 bg-yellow-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center gap-4">
                {status === "loading" ? (
                  <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                ) : session ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-4">
                      {session.user?.image && (
                        <img src={session.user.image} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-yellow-500" />
                      )}
                      <div className="text-left">
                        <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Bem-vindo(a),</p>
                        <p className="text-xl font-black text-white italic">{session.user?.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/player/${(session.user as any)?.steamId || session.user?.id || ''}`)}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase italic tracking-tighter px-8 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                      Acessar Meu Perfil <Zap size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full text-center space-y-4">
                    <p className="text-sm text-zinc-400 font-bold uppercase tracking-wider">Pronto para descobrir suas estatísticas?</p>
                    <button
                      onClick={() => signIn('steam')}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase italic tracking-tighter px-8 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    >
                       Entrar com a Steam
                    </button>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-2">
                       Ou procure jogadores na barra de navegação no topo.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-12 pt-12">
              <div className="text-center">
                <p className="text-3xl font-black italic text-white leading-none">V3</p>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-2">API PÚBLICA</p>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-black italic text-white leading-none">1.2ms</p>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-2">LATÊNCIA</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Shield size={24} />, title: "IA ANTI-CHEAT", desc: "Algoritmos avançados que validam a integridade de cada pick e estatística." },
            { icon: <BarChart3 size={24} />, title: "RADAR PROFISSIONAL", desc: "Compare seu estilo de jogo com os maiores IGLs e Entry Fraggers do país." },
            { icon: <Users size={24} />, title: "FERRAMENTA DE SCOUTING", desc: "A ferramenta definitiva para times amadores encontrarem talentos ocultos." }
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900/40 border border-white/5 p-10 rounded-[40px] hover:bg-zinc-900/60 transition-colors group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
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
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">TropaCS © 2026 • TODOS OS DIREITOS RESERVADOS</p>
      </footer>
    </div>
  );
}
