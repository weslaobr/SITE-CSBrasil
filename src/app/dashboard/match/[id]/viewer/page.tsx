import { Suspense, use } from "react";
import DemoViewer2D from "@/components/tracker/DemoViewer2D";
import { Loader2, ArrowLeft, Download, Share2 } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getMatchData(id: string) {
  // In production, this would fetch from http://localhost:8000/api/match/{id}/stats
  // Mocking for now to avoid build errors if backend is not running during build
  return {
    match: { id, map_name: "de_mirage", match_date: new Date().toISOString() },
    players: [
      { steamid64: "76561198000000000", team: "CT", name: "Player 1" },
      { steamid64: "76561198000000001", team: "T", name: "Player 2" },
    ],
    ticks: [
       { tick: 2000, steamid64: "76561198000000000", pos_x: -1000, pos_y: 500, angle: 90 },
       { tick: 2128, steamid64: "76561198000000000", pos_x: -800, pos_y: 600, angle: 45 },
       { tick: 2000, steamid64: "76561198000000001", pos_x: 500, pos_y: -1000, angle: 180 },
       { tick: 2128, steamid64: "76561198000000001", pos_x: 600, pos_y: -800, angle: 220 },
    ]
  };
}

export default function MatchViewerPage({ params }: PageProps) {
  const { id } = use(params);
  const data = use(getMatchData(id));

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/tracker">
              <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-yellow-500" />
              </button>
            </Link>
            
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic">
                Viewer <span className="text-yellow-500">2D</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">ID: {id} • {data.match.map_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
               <Download className="w-4 h-4" /> CSV EXPORT
             </button>
             <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-colors">
               <Share2 className="w-4 h-4" /> COMPARTILHAR
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Sidebar: Round selection helper would go here */}
           <div className="lg:col-span-1 space-y-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                 <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Round Selector</h3>
                 <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((r) => (
                      <button 
                         key={r} 
                         className="w-10 h-10 border border-white/10 bg-white/5 rounded-lg text-sm font-bold hover:bg-primary hover:text-black transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-3">
             <Suspense fallback={<div className="bg-black/40 aspect-square flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin" /></div>}>
                <DemoViewer2D 
                  matchId={id} 
                  mapName={data.match.map_name} 
                  ticks={data.ticks as any} 
                  players={data.players} 
                />
             </Suspense>
           </div>
        </div>
      </div>
    </main>
  );
}
