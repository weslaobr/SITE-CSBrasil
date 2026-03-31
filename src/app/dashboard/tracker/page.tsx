import { Suspense } from "react";
import ImportMatch from "@/components/tracker/ImportMatch";
import { Loader2, LayoutDashboard, Search, Filter } from "lucide-react";

export const metadata = {
  title: "TropaCS Tracker | Dashboard de Performance",
  description: "Gerencie suas partidas e analise seu desempenho no CS2.",
};

export default function TrackerPage() {
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
          <button className="bg-zinc-900/80 p-3 rounded-full border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 transition-all text-zinc-400 hover:text-yellow-500">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Lado Esquerdo: Importer e Quick Stats */}
        <div className="lg:col-span-1 space-y-8">
          <ImportMatch />
          
          <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[40px] backdrop-blur-3xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 italic">Estatísticas Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group hover:border-yellow-500/20 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">ADR Geral</p>
                <p className="text-2xl font-black italic text-white tracking-tighter group-hover:text-yellow-500 transition-colors">87.5</p>
              </div>
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group hover:border-yellow-500/20 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Taxa HS</p>
                <p className="text-2xl font-black italic text-white tracking-tighter group-hover:text-yellow-500 transition-colors">52%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Match List Placeholder */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/20 border border-white/5 min-h-[600px] rounded-[50px] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-[100px] group-hover:bg-yellow-500/10 transition-colors duration-1000" />
            
            <div className="bg-yellow-500/10 p-8 rounded-[40px] mb-10 relative z-10 border border-yellow-500/10 transform rotate-3 group-hover:rotate-0 transition-transform duration-700">
              <History className="w-16 h-16 text-yellow-500 opacity-40" />
            </div>
            
            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 relative z-10">Nenhuma Partida <span className="text-yellow-500">Processada</span></h3>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest max-w-sm mb-12 relative z-10 opacity-70">
              VINCULE SEU HISTÓRICO PARA LIBERAR A INTELIGÊNCIA Tática.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl relative z-10">
              {[
                { step: "Passo 1", desc: "AUTENTIQUE SUA CONTA NA VALVE" },
                { step: "Passo 2", desc: "COLE SEUS DADOS NO FORMULÁRIO" },
                { step: "Passo 3", desc: "AGUARDE O PARSING DA IA" }
              ].map((item, i) => (
                <div key={i} className="border border-white/5 bg-black/40 p-6 rounded-[32px] text-center group/item hover:border-yellow-500/30 transition-all cursor-default">
                  <p className="font-black italic text-yellow-500 mb-2 uppercase tracking-tighter text-sm">{item.step}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed group-hover/item:text-zinc-300 transition-colors">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
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
