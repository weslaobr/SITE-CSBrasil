"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Crosshair, Shield, Star, Activity, Search } from "lucide-react";
import Link from "next/link";

interface DuoSuggestion {
  userId: string;
  name: string;
  avatar: string | null;
  steamId: string | null;
  rankingPoints: number;
  mixLevel: number;
  faceitLevel: number | null;
  matchesPlayed: number;
  compatibilityScore: number;
}

interface DuoSuggestionsProps {
  steamId?: string;
}

const DuoSuggestions: React.FC<DuoSuggestionsProps> = ({ steamId }) => {
  const [suggestions, setSuggestions] = useState<DuoSuggestion[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myMixLevel, setMyMixLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!steamId) return;
    fetch("/api/duo-suggestions")
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          setMyRating(data.myRating);
          setMyMixLevel(data.myMixLevel);
        }
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Erro ao carregar sugestões"))
      .finally(() => setLoading(false));
  }, [steamId]);

  if (loading) {
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Duo Suggestions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Duo Suggestions</h3>
        </div>
        <p className="text-zinc-600 text-xs font-bold">{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Duo Suggestions</h3>
        </div>
        <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-2xl">
          <Search size={24} className="mx-auto text-zinc-700 mb-2" />
          <p className="text-zinc-600 font-bold text-[10px] uppercase">Nenhum duo compatível encontrado</p>
          <p className="text-zinc-700 text-[9px] font-bold mt-1">Jogue mais partidas para receber sugestões</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-zinc-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "PERFEITO";
    if (score >= 70) return "EXCELENTE";
    if (score >= 50) return "BOM";
    return "REGULAR";
  };

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Duo Suggestions</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] bg-violet-500/10 text-violet-400 px-2 py-1 rounded-md font-bold uppercase">
            Seu Mix: {myMixLevel}
          </span>
          <span className="text-[9px] bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-md font-bold uppercase">
            {myRating} RP
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s, idx) => (
          <motion.div
            key={s.steamId || s.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-2xl p-4 transition-all group"
          >
            <div className="flex items-start gap-3">
              <Link href={`/player/${s.steamId}`}>
                <img
                  src={s.avatar || `https://avatars.steamstatic.com/${s.steamId}_medium.jpg`}
                  alt={s.name}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/player/${s.steamId}`} className="font-black text-sm text-white hover:text-violet-400 transition-colors truncate block">
                  {s.name}
                </Link>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="text-[8px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shield size={8} /> Mix {s.mixLevel}
                  </span>
                  {s.faceitLevel && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star size={8} /> Faceit {s.faceitLevel}
                    </span>
                  )}
                  <span className="text-[8px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Activity size={8} /> {s.matchesPlayed} jogos
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-xs font-black italic ${getScoreColor(s.compatibilityScore)}`}>
                  {s.compatibilityScore}%
                </span>
                <span className={`text-[7px] font-black uppercase tracking-widest ${getScoreColor(s.compatibilityScore)}`}>
                  {getScoreLabel(s.compatibilityScore)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/player/${s.steamId}`}
                className="flex-1 text-center bg-white/5 hover:bg-white/10 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
              >
                Ver Perfil
              </Link>
              <Link
                href={`/compare?steamIdB=${s.steamId}`}
                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
              >
                <Crosshair size={10} /> Comparar
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DuoSuggestions;
