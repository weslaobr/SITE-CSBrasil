"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Filter, Map as MapIcon, Info, Search } from 'lucide-react';

interface Utility {
    id: string;
    map: string;
    type: 'smoke' | 'flash' | 'molotov' | 'grenade';
    side: 'T' | 'CT';
    title: string;
    location: string;
    thumbnail: string;
    videoUrl: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

const SMOKES_DATA: Utility[] = [
    {
        id: '1',
        map: 'Mirage',
        type: 'smoke',
        side: 'T',
        title: 'Smoke CT from A-Ramp',
        location: 'A Site',
        thumbnail: 'https://img.youtube.com/vi/placeholder1/maxresdefault.jpg',
        videoUrl: '#',
        difficulty: 'Easy',
    },
    {
        id: '2',
        map: 'Mirage',
        type: 'smoke',
        side: 'T',
        title: 'Smoke Stairs from A-Ramp',
        location: 'A Site',
        thumbnail: 'https://img.youtube.com/vi/placeholder2/maxresdefault.jpg',
        videoUrl: '#',
        difficulty: 'Easy',
    },
    {
        id: '3',
        map: 'Inferno',
        type: 'smoke',
        side: 'T',
        title: 'Smoke Coffins from Banana',
        location: 'B Site',
        thumbnail: 'https://img.youtube.com/vi/placeholder3/maxresdefault.jpg',
        videoUrl: '#',
        difficulty: 'Medium',
    },
];

const MAPS = ['All', 'Mirage', 'Inferno', 'Ancient', 'Anubis', 'Vertigo', 'Nuke', 'Overpass'];

const SmokesHub: React.FC = () => {
    const [selectedMap, setSelectedMap] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUtilities = SMOKES_DATA.filter(u =>
        (selectedMap === 'All' || u.map === selectedMap) &&
        (u.title.toLowerCase().includes(searchQuery.toLowerCase()) || u.map.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">DATABASE DE UTILITÁRIOS</h1>
                    <p className="text-zinc-500">Domine o jogo com as melhores smokes, flashes e molotovs do cenário competitivo.</p>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                        {MAPS.map((map) => (
                            <button
                                key={map}
                                onClick={() => setSelectedMap(map)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedMap === map
                                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-white/5'
                                    }`}
                            >
                                {map}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar utilitário..."
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Utility Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <AnimatePresence>
                        {filteredUtilities.map((utility) => (
                            <motion.div
                                key={utility.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all shadow-xl"
                            >
                                {/* Thumbnail Area */}
                                <div className="relative aspect-video">
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                                    <img src={utility.thumbnail} alt={utility.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-black cursor-pointer shadow-lg"
                                        >
                                            <Play className="w-6 h-6 fill-current" />
                                        </motion.div>
                                    </div>
                                    {/* Difficulty Badge */}
                                    <div className="absolute top-4 left-4 z-20">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${utility.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                            utility.difficulty === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {utility.difficulty}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">{utility.map}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${utility.side === 'T' ? 'border-orange-500/30 text-orange-500' : 'border-blue-500/30 text-blue-500'
                                            }`}>
                                            {utility.side} SIDE
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{utility.title}</h3>
                                    <div className="flex items-center text-zinc-500 text-xs">
                                        <Info className="w-3 h-3 mr-1" />
                                        Locação: {utility.location}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default SmokesHub;
