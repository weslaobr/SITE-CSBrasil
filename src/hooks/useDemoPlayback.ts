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

  const minTick = useMemo(() => (ticks.length > 0 ? ticks[0].tick : 0), [ticks]);
  const maxTick = useMemo(() => (ticks.length > 0 ? ticks[ticks.length - 1].tick : 0), [ticks]);

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      
      // Calculate how many ticks passed in this frame
      // Standard CS2 tickrate is 64 (logic units per second)
      const ticksPerMs = (64 * playbackSpeed) / 1000;
      const ticksToAdd = deltaTime * ticksPerMs;

      setCurrentTick((prev) => {
        const next = Math.min(prev + ticksToAdd, maxTick);
        if (next >= maxTick) {
          setIsPlaying(false);
          return maxTick;
        }
        return next;
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTick]);

  useEffect(() => {
    onTickChange?.(Math.floor(currentTick));
  }, [currentTick, onTickChange]);

  // Linear Interpolation between sampled ticks
  const getPlayerPositions = useCallback((targetTick: number) => {
    // 1. Group ticks by steamid64
    const players: Record<string, any[]> = {};
    ticks.forEach((t) => {
      if (!players[t.steamid64]) players[t.steamid64] = [];
      players[t.steamid64].push(t);
    });

    const result: Record<string, any> = {};

    Object.keys(players).forEach((steamid) => {
      const pTicks = players[steamid];
      // Find the two surrounding ticks for this player
      let before = pTicks[0];
      let after = pTicks[pTicks.length - 1];

      for (let i = 0; i < pTicks.length - 1; i++) {
        if (pTicks[i].tick <= targetTick && pTicks[i + 1].tick >= targetTick) {
          before = pTicks[i];
          after = pTicks[i + 1];
          break;
        }
      }

      if (before === after) {
        result[steamid] = before;
      } else {
        const span = after.tick - before.tick;
        const progress = (targetTick - before.tick) / span;

        result[steamid] = {
          steamid64: steamid,
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
