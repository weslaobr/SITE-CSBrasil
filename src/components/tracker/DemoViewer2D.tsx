"use client";

import { useRef, useEffect, useState } from "react";
import { useDemoPlayback, TickEntry } from "@/hooks/useDemoPlayback";
import { MAPS_META, worldToCanvas } from "@/lib/tracker/map-utils";
import { Play, Pause, MapPin } from "lucide-react";

interface ViewerProps {
  matchId: string;
  mapName: string;
  ticks: TickEntry[];
  players?: any[];
}

export default function DemoViewer2D({ matchId, mapName, ticks, players = [] }: ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapMeta = MAPS_META[mapName] || MAPS_META["de_mirage"];
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [imgError, setImgError] = useState(false);

  const {
    currentTick,
    setCurrentTick,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    minTick,
    maxTick,
    getPlayerPositions,
  } = useDemoPlayback({ ticks });

  // Inicializar no primeiro tick disponível
  useEffect(() => {
    if (ticks.length > 0) {
      setCurrentTick(ticks[0].tick);
    }
  }, [ticks]);

  // Carrega imagem do mapa (local, sem CORS)
  useEffect(() => {
    setBgImage(null);
    setImgError(false);
    const img = new Image();
    // Sem crossOrigin pois é arquivo local
    img.src = mapMeta.image;
    img.onload = () => setBgImage(img);
    img.onerror = () => {
      console.warn("[DemoViewer2D] Falha ao carregar imagem do mapa:", mapMeta.image);
      setImgError(true);
    };
  }, [mapMeta]);

  // Loop de desenho
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // 1. Desenha mapa ou fallback
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, size, size);
    } else {
      // Fundo escuro com grade como fallback
      ctx.fillStyle = "#0f1117";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const gridStep = size / 16;
      for (let i = 0; i <= size; i += gridStep) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
      }
      // Texto de aviso
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(imgError ? "Mapa não disponível" : "Carregando mapa...", size / 2, size / 2);
    }

    // 2. Posições interpoladas
    const positions = getPlayerPositions(currentTick);

    // 3. Desenha jogadores
    Object.keys(positions).forEach((steamid) => {
      const p = positions[steamid];
      const { x, y } = worldToCanvas(p.pos_x, p.pos_y, mapMeta, size);

      const playerInfo = players.find((pl) => pl.steamid64 === steamid);
      const isCT = playerInfo?.team === "CT";
      const color = isCT ? "#00aaff" : "#ff6600";
      const shadowColor = isCT ? "rgba(0,170,255,0.6)" : "rgba(255,102,0,0.6)";

      // Sombra
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 12;

      // Círculo do jogador
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Direção de olhar
      ctx.beginPath();
      const lineLen = 20;
      const rad = (p.angle * Math.PI) / 180;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(rad) * lineLen, y - Math.sin(rad) * lineLen);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label do jogador
      const name = playerInfo?.name ?? steamid.slice(-4);
      ctx.fillStyle = "white";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name, x, y - 18);
    });
  }, [currentTick, bgImage, imgError, mapMeta, players, getPlayerPositions]);

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
      <div ref={containerRef} className="relative aspect-square w-full max-w-[800px] mx-auto bg-[#0f1117]">
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          className="w-full h-full object-contain"
        />

        {/* Badge do mapa */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
          <MapPin className="w-3 h-3 text-yellow-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{mapMeta.name}</span>
        </div>

        {/* Controles de playback */}
        <div className="absolute bottom-6 left-6 right-6 bg-zinc-900/90 p-5 rounded-3xl backdrop-blur-2xl border border-white/10 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 px-2">
              <input
                type="range"
                min={minTick}
                max={maxTick || 1}
                value={currentTick}
                onChange={(e) => setCurrentTick(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 transition-all"
              />
            </div>

            <div className="text-[10px] font-black italic text-zinc-400 tabular-nums min-w-[70px] uppercase tracking-tighter">
              Tick {Math.floor(currentTick)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
              {[0.5, 1, 2, 4, 8].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`h-8 px-3 text-[10px] font-black rounded-lg transition-all ${
                    playbackSpeed === speed
                      ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/10"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pr-2">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-[#00aaff] border-2 border-zinc-900 shadow-sm"></div>
                <div className="w-4 h-4 rounded-full bg-[#ff6600] border-2 border-zinc-900 shadow-sm"></div>
              </div>
              <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] italic">Intelligence Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
