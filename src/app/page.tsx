"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Search, Trophy, Zap, Shield, BarChart3, Users, ArrowRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  steamId: string;
  name: string | null;
  avatar: string | null;
  directNavigate?: boolean;
}

const DiscordIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 127.14 96.36" 
    fill="currentColor"
    className={className}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C130.46,50.45,125.12,26.8,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.43-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
  </svg>
);

export default function TropaCSHome() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // If it looks like a SteamID, navigate directly
    if (/^\d{15,19}$/.test(q)) {
      router.push(`/player/${q}`);
      return;
    }
    // Otherwise try to use first result
    if (results.length > 0) {
      router.push(`/player/${results[0].steamId}`);
    } else {
      doSearch(q);
    }
  };

  const handleSelect = (r: SearchResult) => {
    router.push(`/player/${r.steamId}`);
    setShowDropdown(false);
    setQuery(r.name || r.steamId);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen selection:bg-yellow-500 selection:text-black">
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-8 overflow-hidden">
          {/* Background Grid/Glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-yellow-500/5 rounded-full blur-[140px]" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-white">ELEVE SEU </span>
                <span className="text-yellow-500">JOGO</span>
              </h1>
              <p className="mt-6 text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs md:text-sm">
                Análise Profunda &amp; Insights de Performance para a Tropa do CS2 Brasileiro
              </p>
            </motion.div>

            {/* ── BARRA DE PESQUISA CENTRAL ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative max-w-2xl mx-auto"
              ref={dropdownRef}
            >
              {/* Glow halo */}
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-transparent rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-0 bg-zinc-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 backdrop-blur-2xl focus-within:border-yellow-500/40 transition-all">
                  {/* Icon */}
                  <div className="pl-5 pr-3 flex-shrink-0">
                    {searching
                      ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                      : <Search className="w-5 h-5 text-zinc-500" />
                    }
                  </div>

                  {/* Input */}
                  <input
                    ref={inputRef}
                    id="player-search-input"
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder="Pesquisar jogador por nome ou SteamID..."
                    className="flex-1 bg-transparent py-4 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
                    autoComplete="off"
                  />

                  {/* Clear */}
                  {query && (
                    <button type="button" onClick={clearSearch} className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex-shrink-0"
                  >
                    Buscar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* ── DROPDOWN DE RESULTADOS ── */}
                <AnimatePresence>
                  {showDropdown && results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-zinc-900/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 backdrop-blur-2xl z-50"
                    >
                      <div className="px-4 py-2 border-b border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                          {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {results.map((r, i) => (
                        <motion.button
                          key={r.steamId}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          type="button"
                          onClick={() => handleSelect(r)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left group"
                        >
                          {r.avatar ? (
                            <img src={r.avatar} alt={r.name || ''} className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-zinc-600" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-sm text-white italic truncate group-hover:text-yellow-400 transition-colors">
                              {r.name || 'Jogador'}
                            </span>
                            <span className="text-[9px] text-zinc-600 font-mono">{r.steamId}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-yellow-500 transition-colors ml-auto flex-shrink-0" />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Sem resultados */}
                  {showDropdown && !searching && results.length === 0 && query.trim().length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-zinc-900/95 border border-white/10 rounded-2xl p-6 text-center shadow-2xl z-50"
                    >
                      <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">Nenhum jogador encontrado</p>
                      <p className="text-zinc-700 text-[9px] mt-1">
                        {/^\d{15,19}$/.test(query.trim())
                          ? 'Pressione Enter para tentar carregar o perfil direto da Steam'
                          : 'Tente buscar pelo SteamID64 do jogador'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest text-center mt-3">
                Digite o nome, nick ou cole o SteamID64 (17 dígitos)
              </p>
            </motion.div>

            {/* Quick access for logged-in users */}
            {status !== 'loading' && session && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="flex items-center gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl px-5 py-3">
                  {session.user?.image && (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-yellow-500/40" />
                  )}
                  <div className="text-left">
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Logado como</p>
                    <p className="text-sm font-black text-white italic leading-none">{session.user?.name}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/player/${(session.user as any)?.steamId || ''}`)}
                    className="ml-2 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95"
                  >
                    Meu Perfil <Zap size={12} />
                  </button>
                </div>
                <a
                  href="https://discord.gg/QGGckW8EAN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#5865F2]/20"
                >
                  <DiscordIcon size={16} /> Discord
                </a>
              </motion.div>
            )}

            {status !== 'loading' && !session && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center"
              >
                <button
                  onClick={() => signIn('steam')}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95"
                >
                  Entrar com a Steam para acessar seu perfil
                </button>
                <a
                  href="https://discord.gg/QGGckW8EAN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#5865F2] font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                >
                  <DiscordIcon size={18} /> Entrar no Discord
                </a>
              </motion.div>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-12 pt-4">
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
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-zinc-900/40 border border-white/5 p-10 rounded-[40px] hover:bg-zinc-900/60 transition-colors group"
            >
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-black italic uppercase text-white mb-3 tracking-tight">{f.title}</h3>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
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
