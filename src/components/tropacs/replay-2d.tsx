"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward, SkipBack, Target, Shield, Skull } from 'lucide-react';
import { worldToMap } from '@/lib/map-data';

interface PlayerPos {
  id: string;
  x: number;
  y: number;
  a: number; // angle
  l: boolean; // is_alive
  s: string; // side (CT/T)
}

interface ReplayData {
  [tick: string]: PlayerPos[];
}

interface KillEvent {
  tick: number;
  attackerName: string;
  victimName: string;
  attackerSide: string;
  victimSide: string;
  attX: number;
  attY: number;
  vicX: number;
  vicY: number;
  weapon: string;
}

interface Props {
  mapName: string;
  replayData: { [tick: string]: number[][] }; // [idx, x, y, angle]
  killEvents: KillEvent[];
  playerIndexMap: { [idx: string]: string }; // idx -> steamId
  stats?: any[]; // Para pegar o time (CT/T) do jogador
}

const Replay2D: React.FC<Props> = ({ mapName, replayData, killEvents, playerIndexMap, stats }) => {
  const [currentTickIdx, setCurrentTickIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  const ticks = useMemo(() => Object.keys(replayData).map(Number).sort((a, b) => a - b), [replayData]);
  const currentTick = ticks[currentTickIdx];
  
  const players = useMemo(() => {
    const raw = replayData[currentTick] || [];
    return raw.map(p => {
      const steamId = playerIndexMap[p[0]];
      const playerStat = stats?.find(s => String(s.steam64_id || s.steamId) === String(steamId));
      return {
        id: steamId,
        x: p[1],
        y: p[2],
        a: p[3],
        s: playerStat?.team || playerStat?.initial_team_number === 2 ? 'CT' : 'T'
      };
    });
  }, [currentTick, replayData, playerIndexMap, stats]);

  // Encontrar kills recentes (últimos 3 segundos / 3 ticks na nossa amostragem de 1Hz)
  const recentKills = useMemo(() => {
    return killEvents.filter(k => k.tick <= currentTick && k.tick > currentTick - 300); // 300 ticks aprox 5s
  }, [killEvents, currentTick]);

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        setCurrentTickIdx(prev => (prev < ticks.length - 1 ? prev + 1 : prev));
      }, 1000 / playbackSpeed);
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, [isPlaying, playbackSpeed, ticks.length]);

  const mapUrl = `https://raw.githubusercontent.com/pajlada/csgo-overviews/master/overviews/${mapName.toLowerCase()}.png`;

  return (
    <div className="flex flex-col gap-6 bg-zinc-950/50 p-6 rounded-[32px] border border-white/5">
      {/* Header com infos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <Target className="text-yellow-500" size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-white">Visualizador 2D</h4>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Demonstração de Posicionamento e Engagement</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tick: {currentTick}</span>
          </div>
          <select 
            value={playbackSpeed} 
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
            <option value={8}>8x</option>
          </select>
        </div>
      </div>

      {/* Container do Mapa */}
      <div className="relative aspect-square w-full max-w-[600px] mx-auto bg-black rounded-3xl overflow-hidden border-4 border-white/5 shadow-2xl group">
        {/* Imagem do Mapa */}
        <img 
          src={mapUrl} 
          alt={mapName}
          className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png';
          }}
        />

        {/* Overlay de Kills Recentes */}
        <AnimatePresence>
          {recentKills.map((k, i) => {
            const pos = worldToMap(k.vicX, k.vicY, mapName);
            return (
              <motion.div
                key={`kill-${k.tick}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="absolute z-30 pointer-events-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/40 rounded-full animate-ping" />
                  <Skull className="text-white fill-red-600" size={24} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Jogadores */}
        {players.map((p) => {
          if (!p.l) return null; // Morto
          const pos = worldToMap(p.x, p.y, mapName);
          const isCT = p.s === 'CT';
          
          return (
            <motion.div
              key={p.id}
              className="absolute z-20"
              animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              transition={{ duration: 1 / playbackSpeed, ease: "linear" }}
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex items-center justify-center">
                {/* Indicador de Direção (Ângulo) */}
                <div 
                  className="absolute w-8 h-8 pointer-events-none"
                  style={{ transform: `rotate(${-p.a - 90}deg)` }}
                >
                  <div className={`w-full h-full border-t-2 ${isCT ? 'border-sky-400' : 'border-orange-400'} opacity-40 rounded-full`} />
                </div>
                
                {/* Marcador do Jogador */}
                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-lg ${isCT ? 'bg-sky-500' : 'bg-orange-500'} relative`}>
                   {/* Tooltip simples no hover se quiser */}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Controles de Playback */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-2xl bg-yellow-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
          </button>

          <div className="flex-1 px-4 relative flex items-center">
             <input 
              type="range"
              min={0}
              max={ticks.length - 1}
              value={currentTickIdx}
              onChange={(e) => setCurrentTickIdx(Number(e.target.value))}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-yellow-500"
             />
          </div>

          <button 
            onClick={() => { setCurrentTickIdx(0); setIsPlaying(false); }}
            className="w-12 h-12 rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="flex justify-between px-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-700">
           <span>Início</span>
           <span className="text-zinc-500">Duração: {Math.floor(ticks.length)}s</span>
           <span>Fim</span>
        </div>
      </div>
    </div>
  );
};

export default Replay2D;
