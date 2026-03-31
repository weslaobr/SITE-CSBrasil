"use client";

import { Suspense, useState, useEffect } from "react";
import ImportMatch from "@/components/tracker/ImportMatch";
import { Loader2, LayoutDashboard, Search, Filter, Play, Calendar, Map as MapIcon, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function TrackerPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock matches for UI testing if the database is empty
  const mockMatches = [
    { match_id: "match-mirage-mock", map_name: "de_mirage", parsed_at: new Date().toISOString(), is_parsed: true },
    { match_id: "match-dust2-mock", map_name: "de_dust2", parsed_at: new Date().toISOString(), is_parsed: true },
  ];

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("http://localhost:8000/api/match/list");
        if (res.ok) {
          const data = await res.json();
          setMatches(data.length > 0 ? data : mockMatches);
        } else {
           setMatches(mockMatches);
        }
      } catch (err) {
        setMatches(mockMatches);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            CS2 <span className="text-yellow-500">Performance</span> Tracker
          </h1>
          <p className="text-zinc-500 mt-2 text-xs font-black uppercase tracking-[0.2em] italic ml-16">
            Analítica avançada de demos, ADR, Headshots e Heatmaps.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-yellow-500/10 rounded-full blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              placeholder="BUSCAR PARTIDA..." 
              className="bg-zinc-900/80 border border-white/10 rounded-full py-3 pl-12 pr-6 text-xs font-bold uppercase italic tracking-wider text-white focus:outline-none focus:border-yellow-500/50 transition-all w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Lado Esquerdo: Importer e Quick Stats */}
        <div className="lg:col-span-1 space-y-8">
          <ImportMatch />
          
          <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[40px] backdrop-blur-3xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 italic">Estatísticas Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group hover:border-yellow-500/20 transition-colors cursor-default">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">ADR Geral</p>
                <p className="text-2xl font-black italic text-white tracking-tighter group-hover:text-yellow-500 transition-colors">87.5</p>
              </div>
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group hover:border-yellow-500/20 transition-colors cursor-default">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Taxa HS</p>
                <p className="text-2xl font-black italic text-white tracking-tighter group-hover:text-yellow-500 transition-colors">52%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Match List */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
             <div className="bg-zinc-900/20 border border-white/5 min-h-[400px] rounded-[50px] flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-500" />
             </div>
          ) : (
            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-6 italic mb-6">Últimas Partidas Processadas</h3>
               {matches.map((match) => (
                 <div key={match.match_id} className="group bg-zinc-900/40 border border-white/5 p-6 rounded-[32px] hover:bg-zinc-900/60 hover:border-yellow-500/20 transition-all flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                          <MapIcon size={24} />
                       </div>
                       <div>
                          <p className="text-lg font-black italic uppercase tracking-tighter text-white group-hover:text-yellow-500 transition-colors">{match.map_name.replace("de_", "")}</p>
                          <div className="flex items-center gap-4 mt-1">
                             <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 leading-none">
                                <Calendar size={10} /> {new Date(match.parsed_at).toLocaleDateString()}
                             </span>
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full border border-green-500/10">Processada</span>
                          </div>
                       </div>
                    </div>
                    
                    <Link href={`/dashboard/match/${match.match_id}/viewer`}>
                       <button className="flex items-center gap-3 bg-white/5 hover:bg-yellow-500 hover:text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 group/btn">
                          <Play size={14} className="fill-current" />
                          Ver Analytics 2D
                          <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                       </button>
                    </Link>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-componentes
function History({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// Sub-componentes
function History({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
