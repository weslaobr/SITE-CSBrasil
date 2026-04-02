"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DemoViewer2D from "@/components/tracker/DemoViewer2D";
import { TickEntry } from "@/hooks/useDemoPlayback";
import { Loader2, ArrowLeft, Download, Share2, AlertTriangle, MapPin } from "lucide-react";
import Link from "next/link";

interface MatchData {
  match_id?: string;
  id?: string;
  map_name: string;
  match_date?: string;
}

interface PlayerData {
  steamid64?: string;
  steam64_id?: string;
  team?: string;
  team_id?: string;
  name?: string;
  nickname?: string;
}

export default function MatchViewerPage() {
  const params = useParams();
  const id = params?.id as string;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [ticks, setTicks] = useState<TickEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticksAvailable, setTicksAvailable] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Buscar dados do match (usa API Next.js que consulta DB + Leetify)
        const matchRes = await fetch(`/api/match/${id}`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatch({
            id: matchData.match_id || id,
            map_name: matchData.map_name || "de_mirage",
            match_date: matchData.match_date,
          });

          // Normalizar jogadores
          if (Array.isArray(matchData.stats)) {
            setPlayers(
              matchData.stats.map((p: any) => ({
                steamid64: p.steam64_id || p.steamId || p.steamid64,
                team: p.team_id || p.team,
                name: p.nickname || p.name || "Jogador",
              }))
            );
          }
        } else {
          // Fallback mínimo
          setMatch({ id, map_name: "de_mirage" });
        }

        // 2. Buscar ticks de posição do backend Python (via proxy)
        const ticksRes = await fetch(`/api/match/${id}/ticks`);
        if (ticksRes.ok) {
          const ticksData = await ticksRes.json();
          const tickArray: TickEntry[] = ticksData.ticks || [];
          setTicks(tickArray);
          setTicksAvailable(tickArray.length > 0);
        } else {
          setTicksAvailable(false);
        }
      } catch (e) {
        console.error("Erro ao carregar viewer:", e);
        setError("Não foi possível carregar os dados da partida.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <Link href="/matches">
              <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5 text-yellow-500" />
              </button>
            </Link>

            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic">
                Viewer <span className="text-yellow-500">2D</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                <span>ID: {id}</span>
                {match && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <MapPin className="w-2.5 h-2.5 text-yellow-500/60" />
                    <span>{match.map_name}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" /> CSV Export
            </button>
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-colors">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-yellow-500/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-t-yellow-500 rounded-full animate-spin shadow-[0_0_20px_rgba(246,203,2,0.3)]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 animate-pulse">Carregando dados do replay...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm text-zinc-400 font-bold">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Info do match */}
              <div className="bg-zinc-950/60 border border-white/[0.07] rounded-2xl p-4 space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Informações</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Mapa</span>
                    <span className="text-[11px] font-black text-zinc-300 uppercase">
                      {match?.map_name?.replace("de_", "").replace(/_/g, " ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Jogadores</span>
                    <span className="text-[11px] font-black text-zinc-300">{players.length > 0 ? players.length : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Status dos ticks */}
              {!ticksAvailable && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Demo não processada</p>
                      <p className="text-[9px] text-zinc-500 leading-relaxed">
                        Os dados de posição dos jogadores ainda não foram extraídos desta demo. O mapa será exibido sem movimentação.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de jogadores */}
              {players.length > 0 && (
                <div className="bg-zinc-950/60 border border-white/[0.07] rounded-2xl p-4 space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Jogadores</h3>
                  <div className="space-y-1.5">
                    {players.map((p, i) => {
                      const isCT = (p.team || p.team_id) === "CT";
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isCT ? "bg-[#00aaff]" : "bg-[#ff6600]"}`} />
                          <span className="text-[10px] font-bold text-zinc-400 truncate">
                            {p.name || p.nickname || "Jogador " + (i + 1)}
                          </span>
                          <span className="text-[8px] font-black text-zinc-700 ml-auto uppercase">{isCT ? "CT" : "TR"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Canvas viewer */}
            <div className="lg:col-span-3">
              <DemoViewer2D
                matchId={id}
                mapName={match?.map_name || "de_mirage"}
                ticks={ticks}
                players={players.map(p => ({
                  steamid64: p.steamid64,
                  team: p.team || p.team_id,
                  name: p.name || p.nickname,
                }))}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
