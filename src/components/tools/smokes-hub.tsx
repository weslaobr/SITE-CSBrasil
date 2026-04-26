"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Filter, Map as MapIcon, Info, Search, Target, Flame, Wind, Eye } from 'lucide-react';

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

const MAPS = ['All', 'Mirage', 'Inferno', 'Ancient', 'Anubis', 'Vertigo', 'Nuke', 'Overpass', 'Dust2'];

const SmokesHub: React.FC = () => {
    const [selectedMap, setSelectedMap] = useState('All');
    const [selectedType, setSelectedType] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUtilities = SMOKES_DATA.filter(u =>
        (selectedMap === 'All' || u.map === selectedMap) &&
        (selectedType === 'All' || u.type === selectedType) &&
        (u.title.toLowerCase().includes(searchQuery.toLowerCase()) || u.map.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const types = [
        { id: 'All', icon: <Filter size={14} />, label: 'Todos' },
        { id: 'smoke', icon: <Wind size={14} />, label: 'Smokes' },
        { id: 'flash', icon: <Eye size={14} />, label: 'Flashes' },
        { id: 'molotov', icon: <Flame size={14} />, label: 'Molotovs' },
    ];

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md">
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                    <div className="flex flex-col gap-4 w-full lg:w-auto">
                        {/* Map Selector */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {MAPS.map((map) => (
                                <button
                                    key={map}
                                    onClick={() => setSelectedMap(map)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                        selectedMap === map
                                            ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20'
                                            : 'bg-zinc-950/50 text-zinc-500 hover:text-white border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    {map}
                                </button>
                            ))}
                        </div>

                        {/* Type Selector */}
                        <div className="flex items-center gap-2">
                            {types.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedType(t.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border ${
                                        selectedType === t.id
                                            ? 'bg-zinc-800 text-purple-400 border-purple-500/30 shadow-inner'
                                            : 'bg-transparent text-zinc-600 hover:text-zinc-400 border-transparent hover:border-white/5'
                                    }`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar no database..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Utility Grid */}
            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
                <AnimatePresence mode="popLayout">
                    {filteredUtilities.map((utility) => (
                        <motion.div
                            key={utility.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="group relative bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden hover:border-purple-500/40 transition-all shadow-2xl backdrop-blur-sm"
                        >
                            {/* Thumbnail Area */}
                            <div className="relative aspect-video overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                                <img src={utility.thumbnail} alt={utility.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                
                                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="w-14 h-14 bg-purple-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                                    >
                                        <Play className="w-6 h-6 fill-current ml-1" />
                                    </motion.div>
                                </div>

                                {/* Difficulty Badge */}
                                <div className="absolute top-4 left-4 z-20">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border backdrop-blur-md ${
                                        utility.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        utility.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {utility.difficulty}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">{utility.map}</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                        utility.side === 'T' ? 'border-orange-500/30 text-orange-500 bg-orange-500/5' : 'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                    }`}>
                                        {utility.side} SIDE
                                    </span>
                                </div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2 group-hover:text-purple-400 transition-colors">{utility.title}</h3>
                                <div className="flex items-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                    <Target className="w-3 h-3 mr-2 text-purple-500/50" />
                                    Locação: <span className="text-zinc-300 ml-1">{utility.location}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {filteredUtilities.length === 0 && (
                <div className="py-20 text-center bg-zinc-900/20 border border-dashed border-white/5 rounded-[2.5rem]">
                    <Search size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Nenhum utilitário encontrado para esses filtros.</p>
                </div>
            )}
        </div>
    );
};

export default SmokesHub;
