"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Search, Wind, Eye, Bomb, Flame, X, ChevronLeft, ChevronRight, MapPin, Crosshair, ArrowRight } from 'lucide-react';
import { UTILITIES, MAPS, type Utility } from '@/data/utilities';

const TYPE_CONFIG = {
  all:    { icon: <Wind size={14} />, label: 'Todos' },
  smoke:  { icon: <Wind size={14} />, label: 'Smokes' },
  flash:  { icon: <Eye size={14} />, label: 'Flashes' },
  he:     { icon: <Bomb size={14} />, label: 'Explosivas' },
  molotov:{ icon: <Flame size={14} />, label: 'Molotovs' },
} as const;

type UtilityType = keyof typeof TYPE_CONFIG;

const YouTubeModal: React.FC<{ videoId: string; title: string; startTime?: number; onClose: () => void }> = ({ videoId, title, startTime, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startTime ? `&start=${startTime}` : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      >
        <iframe
          src={src}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 transition-all"
        >
          <X size={18} className="text-white" />
        </button>
      </motion.div>
    </motion.div>
  );
};

const SmokesHub: React.FC = () => {
  const [selectedMap, setSelectedMap] = useState('All');
  const [selectedType, setSelectedType] = useState<UtilityType>('all');
  const [selectedSide, setSelectedSide] = useState<'all' | 'T' | 'CT'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string; startTime?: number } | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 12;

  const filtered = UTILITIES.filter(u =>
    (selectedMap === 'All' || u.map === selectedMap) &&
    (selectedType === 'all' || u.type === selectedType) &&
    (selectedSide === 'all' || u.side === selectedSide) &&
    (u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.map.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const handleOpenVideo = useCallback((u: Utility) => {
    setActiveVideo({ videoId: u.videoId, title: u.title, startTime: u.startTime });
  }, []);

  return (
    <div className="space-y-6">
      {/* ── FILTERS ── */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-5 backdrop-blur-md space-y-4">
        {/* Map + Side row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Maps */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar flex-wrap">
            <button onClick={() => { setSelectedMap('All'); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                selectedMap === 'All' ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-950/50 text-zinc-500 hover:text-white border-white/5'}`}>
              Todos
            </button>
            {MAPS.map(m => (
              <button key={m} onClick={() => { setSelectedMap(m); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  selectedMap === m ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-950/50 text-zinc-500 hover:text-white border-white/5'}`}>
                {m}
              </button>
            ))}
          </div>
          {/* Side */}
          <div className="flex gap-1 p-0.5 bg-zinc-950 border border-white/5 rounded-lg shrink-0">
            {(['all', 'T', 'CT'] as const).map(s => (
              <button key={s} onClick={() => { setSelectedSide(s); setPage(0); }}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedSide === s
                    ? s === 'all' ? 'bg-zinc-800 text-white' : s === 'T' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-600 hover:text-zinc-400'}`}>
                {s === 'all' ? 'Todos' : s + ' Side'}
              </button>
            ))}
          </div>
        </div>

        {/* Type + Search row */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          {/* Types */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.entries(TYPE_CONFIG) as [UtilityType, typeof TYPE_CONFIG[UtilityType]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => { setSelectedType(key); setPage(0); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tight transition-all border ${
                  selectedType === key ? 'bg-zinc-800 text-purple-400 border-purple-500/30' : 'bg-transparent text-zinc-600 hover:text-zinc-400 border-transparent'}`}>
                {cfg.icon}{cfg.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input type="text" placeholder="Buscar..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-purple-500/50 transition-all"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} />
          </div>
        </div>
      </div>

      {/* ── COUNTER ── */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
        <span>{filtered.length} lineups</span>
        {totalPages > 1 && <span>Página {page + 1}/{totalPages}</span>}
      </div>

      {/* ── GRID ── */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {paged.map((u) => (
            <motion.div
              key={u.id} layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all shadow-lg backdrop-blur-sm cursor-pointer"
              onClick={() => handleOpenVideo(u)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                <img src={`https://img.youtube.com/vi/${u.videoId}/hqdefault.jpg`} alt={u.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-purple-500/90 text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                {/* Duration */}
                <div className="absolute bottom-2 right-2 z-20 bg-black/80 text-xs font-bold px-2 py-1 rounded-md border border-white/10">
                  <span className="text-xs font-black">{u.duration >= 60 ? `${Math.floor(u.duration / 60)}:${String(u.duration % 60).padStart(2, '0')}` : `${u.duration}s`}</span>
                </div>
                {/* Badges */}
                <div className="absolute top-2 left-2 z-20 flex gap-1.5">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border backdrop-blur-sm ${
                    u.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    u.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {u.difficulty}
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border backdrop-blur-sm ${
                    u.type === 'smoke' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                    u.type === 'flash' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    u.type === 'he' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                    {u.type}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">{u.map}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                    u.side === 'T' ? 'border-orange-500/30 text-orange-500 bg-orange-500/5' : 'border-blue-500/30 text-blue-500 bg-blue-500/5'}`}>
                    {u.side}
                  </span>
                </div>
                <h3 className="text-sm font-black italic uppercase tracking-tight text-white group-hover:text-purple-400 transition-colors leading-tight">{u.title}</h3>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                  <MapPin size={11} className="text-purple-500/60 shrink-0" />
                  <span className="truncate">{u.from}</span>
                  <ArrowRight size={10} className="text-zinc-600 shrink-0" />
                  <Crosshair size={11} className="text-purple-500/60 shrink-0" />
                  <span className="truncate">{u.to}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── EMPTY ── */}
      {filtered.length === 0 && (
        <div className="py-16 text-center bg-zinc-900/20 border border-dashed border-white/5 rounded-[2.5rem]">
          <Search size={40} className="mx-auto text-zinc-800 mb-3" />
          <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Nenhum lineup encontrado</p>
        </div>
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 bg-zinc-900/50 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft size={12} /> Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-8 h-8 rounded-md text-[10px] font-black tracking-wider transition-all border ${
                page === i ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:text-white'}`}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 bg-zinc-900/50 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Próximo <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* ── MODAL ── */}
      <AnimatePresence>
        {activeVideo && (
          <YouTubeModal videoId={activeVideo.videoId} title={activeVideo.title} startTime={activeVideo.startTime} onClose={() => setActiveVideo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmokesHub;
