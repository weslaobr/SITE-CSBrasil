"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users, Search, Star, MessageSquareQuote, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResenhaHubPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/resenha");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLists = lists.filter((l) =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32">
      {/* HERO HEADER */}
      <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between w-full">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
              <MessageSquareQuote className="text-yellow-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                  A Grande
                </span>
                <span className="text-yellow-400"> Resenha</span>
              </h1>
              <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                <span className="w-4 h-px bg-yellow-500/40" />
                Dê a sua nota para a tropa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 z-20 mt-4 sm:mt-0">
            <Link href="/resenha/ranking">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all text-white bg-zinc-900 border border-white/10 hover:border-white/30 hover:bg-zinc-800">
                <Star size={16} className="text-yellow-500" /> Ranking Global
              </button>
            </Link>
            {session ? (
              <Link href="/resenha/create">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs transition-all shadow-lg bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20 active:scale-95 border border-yellow-400/50">
                  <Plus size={16} /> Nova Resenha
                </button>
              </Link>
            ) : (
              <p className="text-xs text-zinc-500 font-bold bg-zinc-900/50 px-4 py-2 rounded-lg border border-white/5">
                Faça login para criar a sua lista.
              </p>
            )}
          </div>
        </div>
      </header>

      {/* FILTER/SEARCH */}
      <div className="relative max-w-md z-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar resenha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors"
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-zinc-900/40 border border-white/5 rounded-2xl animate-pulse"
            />
          ))
        ) : filteredLists.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-zinc-900/20">
            <MessageSquareQuote size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
              Nenhuma resenha encontrada.
            </p>
          </div>
        ) : (
          filteredLists.map((list) => (
            <Link key={list.id} href={`/resenha/${list.id}`} className="group outline-none">
              <div className="relative p-[1px] rounded-[24px] bg-gradient-to-b from-white/10 to-transparent hover:from-yellow-500/50 hover:to-yellow-500/0 transition-all duration-500 shadow-xl shadow-black/40 hover:shadow-yellow-500/10 active:scale-95">
                <div className="h-full bg-zinc-900/90 backdrop-blur-xl p-6 rounded-[23px] flex flex-col relative overflow-hidden">
                  
                  {/* Subtle Background Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-colors pointer-events-none" />

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white group-hover:text-yellow-400 transition-colors drop-shadow-md pr-2">
                      {list.title}
                    </h3>
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs text-yellow-500 font-black border border-yellow-500/20 shadow-inner shrink-0">
                      <Users size={12} className="text-yellow-400 shrink-0" />
                      {list._count?.evaluations || 0} <span className="hidden xl:inline">Avaliados</span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 line-clamp-2 mb-6 min-h-[40px] font-medium leading-relaxed relative z-10">
                    {list.description || "Esta lista não possui uma descrição detalhada, mas aguarda a sua resenha."}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-5 border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-3">
                      {list.creator?.image ? (
                        <img src={list.creator.image} className="w-9 h-9 rounded-full border-2 border-white/10" alt={list.creator.name} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-white/10">
                          <Star size={14} className="text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-black uppercase text-white truncate max-w-[120px]">
                          {list.creator?.name || "Anônimo"}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                          {new Date(list.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="w-9 h-9 rounded-[10px] bg-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-yellow-500 group-hover:text-black transition-all group-hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
