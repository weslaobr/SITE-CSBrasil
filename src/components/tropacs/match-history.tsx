import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const ITEMS_PER_PAGE = 10;

export default function MatchHistory({ matches, onReview }: MatchHistoryProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedMatches = matches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
        <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl flex flex-col h-full">
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-green-500 rounded-full" /> Histórico de Combate
            </h3>

            <div className="space-y-4 flex-grow">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {paginatedMatches.length > 0 ? paginatedMatches.map((match, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
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

                                <div className="flex items-center gap-4 md:gap-10">
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
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                        Página <span className="text-white">{currentPage}</span> de <span className="text-zinc-400">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                        currentPage === i + 1 ? 'bg-green-500 w-4' : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
