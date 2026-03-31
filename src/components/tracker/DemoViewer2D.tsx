"use client";

import { useRef, useEffect, useState } from "react";
import { useDemoPlayback, TickEntry } from "@/hooks/useDemoPlayback";
import { MAPS_META, worldToCanvas } from "@/lib/tracker/map-utils";
import { Play, Pause } from "lucide-react";

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

  // Load Map Background
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = mapMeta.image;
    img.onload = () => setBgImage(img);
  }, [mapMeta]);

  // Main Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      
      // 1. Draw Map
      ctx.drawImage(bgImage, 0, 0, size, size);

      // 2. Get Interpolated Positions
      const positions = getPlayerPositions(currentTick);

      // 3. Draw Players
      Object.keys(positions).forEach((steamid) => {
        const p = positions[steamid];
        const { x, y } = worldToCanvas(p.pos_x, p.pos_y, mapMeta, size);
        
        // Find player team for color
        const playerInfo = players.find((pl) => pl.steamid64 === steamid);
        const isCT = playerInfo?.team === "CT";
        const color = isCT ? "#00aaff" : "#ffaa00";

        // Draw Player Circle
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Look Direction (Angle)
        ctx.beginPath();
        const lineLen = 18;
        const rad = (p.angle * Math.PI) / 180;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(rad) * lineLen, y - Math.sin(rad) * lineLen);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    };

    render();
  }, [currentTick, bgImage, mapMeta, players, getPlayerPositions]);

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
      <div ref={containerRef} className="relative aspect-square w-full max-w-[800px] mx-auto bg-[#050505]">
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          className="w-full h-full object-contain"
        />
        
        {/* Playback Controls Overlay */}
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
                max={maxTick}
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
                  <div className="w-4 h-4 rounded-full bg-[#ffaa00] border-2 border-zinc-900 shadow-sm"></div>
               </div>
               <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] italic">Intelligence Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
