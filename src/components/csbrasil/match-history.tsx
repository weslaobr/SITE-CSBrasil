"use client";

import { motion } from 'framer-motion';

interface Match {
    id: string;
    map_name: string;
    outcome: string;
    score: [number, number];
    leetify_rating?: number;
    finished_at: string;
    data_source?: string;
}

interface MatchHistoryProps {
    matches: Match[];
    onReview: (id: string) => void;
}

export default function MatchHistory({ matches, onReview }: MatchHistoryProps) {
    const getMapImage = (name: string) => {
        if (!name) return 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png';
        const mapName = name.toLowerCase().replace('de_', '').trim();
        const mapMapping: Record<string, string> = {
            'dust 2': 'de_dust2', 'dust2': 'de_dust2', 'dust ii': 'de_dust2',
            'mirage': 'de_mirage', 'inferno': 'de_inferno', 'nuke': 'de_nuke',
            'overpass': 'de_overpass', 'vertigo': 'de_vertigo', 'ancient': 'de_ancient',
            'anubis': 'de_anubis'
        };
        const officialName = mapMapping[mapName] || `de_${mapName}`;
        return `https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/${officialName}.png`;
    };

    return (
        <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl">
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-green-500 rounded-full" /> Histórico de Combate
            </h3>

            <div className="space-y-4">
                {matches.length > 0 ? matches.map((match, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={match.id}
                        className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl flex items-center justify-between border border-white/5 group transition-all"
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative w-12 h-12 shrink-0">
                                <img 
                                    src={getMapImage(match.map_name)} 
                                    className="w-full h-full object-cover rounded-xl border border-white/10" 
                                    alt={match.map_name}
                                />
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center font-black italic text-[9px] shadow-lg border-2 border-zinc-950 ${
                                    match.outcome === 'win' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                                }`}>
                                    {match.outcome === 'win' ? 'W' : 'L'}
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-black italic uppercase text-sm tracking-tighter">
                                    {match.map_name.replace('de_', '')}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">
                                    {match.data_source || 'Matchmaking'} • {new Date(match.finished_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="text-center hidden md:block">
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Score</p>
                                <p className="text-white font-black italic">
                                    {match.score[0]} - {match.score[1]}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Rating</p>
                                <p className={`font-black italic ${(match.leetify_rating || 0) > 0 ? 'text-green-500' : 'text-zinc-400'
                                    }`}>
                                    {(match.leetify_rating || 0).toFixed(2)}
                                </p>
                            </div>
                            <button
                                onClick={() => onReview(match.id)}
                                className="bg-white/5 hover:bg-green-500 hover:text-black p-2 rounded-xl border border-white/10 transition-colors inline-block"
                            >
                                <span className="text-[10px] font-black uppercase">Review</span>
                            </button>
                        </div>
                    </motion.div>
                )) : (
                    <p className="text-center text-zinc-500 py-10 font-bold italic uppercase text-xs">Aguardando novos registros do Leetify...</p>
                )}
            </div>
        </div>
    );
}
