import { useState, useEffect, useRef, useMemo, useCallback } from "react";

export interface TickEntry {
  tick: number;
  steamid64: string;
  pos_x: number;
  pos_y: number;
  angle: number;
}

export interface PlaybackOptions {
  ticks: TickEntry[];
  onTickChange?: (tick: number) => void;
}

export function useDemoPlayback({ ticks, onTickChange }: PlaybackOptions) {
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  // Refs para evitar stale closure no loop de animação
  const playbackSpeedRef = useRef(playbackSpeed);
  const isPlayingRef = useRef(isPlaying);

  const minTick = useMemo(() => (ticks.length > 0 ? ticks[0].tick : 0), [ticks]);
  const maxTick = useMemo(() => (ticks.length > 0 ? ticks[ticks.length - 1].tick : 0), [ticks]);
  const maxTickRef = useRef(maxTick);

  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { maxTickRef.current = maxTick; }, [maxTick]);

  const animateRef = useRef<FrameRequestCallback | null>(null);

  animateRef.current = (time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      // CS2 tickrate padrão: 64 ticks/s
      const ticksPerMs = (64 * playbackSpeedRef.current) / 1000;
      const ticksToAdd = deltaTime * ticksPerMs;

      setCurrentTick((prev) => {
        const next = Math.min(prev + ticksToAdd, maxTickRef.current);
        if (next >= maxTickRef.current) {
          setIsPlaying(false);
          return maxTickRef.current;
        }
        return next;
      });
    }
    lastTimeRef.current = time;
    if (animateRef.current) {
      requestRef.current = requestAnimationFrame(animateRef.current);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      if (animateRef.current) {
        requestRef.current = requestAnimationFrame(animateRef.current);
      }
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    onTickChange?.(Math.floor(currentTick));
  }, [currentTick, onTickChange]);

  // Interpolação linear entre os ticks amostrados
  const getPlayerPositions = useCallback((targetTick: number) => {
    const playerMap: Record<string, TickEntry[]> = {};
    ticks.forEach((t) => {
      if (!playerMap[t.steamid64]) playerMap[t.steamid64] = [];
      playerMap[t.steamid64].push(t);
    });

    const result: Record<string, TickEntry> = {};

    Object.keys(playerMap).forEach((steamid) => {
      const pTicks = playerMap[steamid];
      let before = pTicks[0];
      let after = pTicks[pTicks.length - 1];

      for (let i = 0; i < pTicks.length - 1; i++) {
        if (pTicks[i].tick <= targetTick && pTicks[i + 1].tick >= targetTick) {
          before = pTicks[i];
          after = pTicks[i + 1];
          break;
        }
      }

      if (before === after || before.tick === after.tick) {
        result[steamid] = before;
      } else {
        const span = after.tick - before.tick;
        const progress = (targetTick - before.tick) / span;
        result[steamid] = {
          steamid64: steamid,
          tick: targetTick,
          pos_x: before.pos_x + (after.pos_x - before.pos_x) * progress,
          pos_y: before.pos_y + (after.pos_y - before.pos_y) * progress,
          angle: before.angle + (after.angle - before.angle) * progress,
        };
      }
    });

    return result;
  }, [ticks]);

  return {
    currentTick,
    setCurrentTick,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    minTick,
    maxTick,
    getPlayerPositions,
  };
}
