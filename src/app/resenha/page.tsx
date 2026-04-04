"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users, Search, Star, MessageSquareQuote } from "lucide-react";
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
            <Link key={list.id} href={`/resenha/${list.id}`}>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer backdrop-blur-xl group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black uppercase text-white tracking-wider group-hover:text-yellow-400 transition-colors">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded text-xs text-zinc-400 font-bold border border-white/5">
                    <Users size={12} className="text-yellow-500" />
                    {list._count.evaluations} <span className="hidden sm:inline">Avaliados</span>
                  </div>
                </div>

                <p className="text-sm text-zinc-500 line-clamp-2 mb-6 min-h-[40px]">
                  {list.description || "Nenhuma descrição."}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                    <Star size={14} className="text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">
                      Anônimo
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      {new Date(list.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
