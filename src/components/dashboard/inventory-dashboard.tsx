"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Box, Eye, ShoppingCart, Info, ChevronDown } from 'lucide-react';

interface InventoryItem {
    assetid: string;
    name: string;
    market_name: string;
    icon_url: string;
    rarity: string;
    rarity_color: string;
    type: string;
    price?: number | null;
    inspect_url?: string | null;
    market_url?: string | null;
}

const InventoryDashboard: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, weapon, knife, gloves
    const [filterRarity, setFilterRarity] = useState('all');

    // Extrair raridades únicas presentes no inventário
    const rarities = Array.from(new Set(items.map(i => i.rarity).filter(Boolean)));
    
    const categories = [
        { id: 'all', label: 'Todos' },
        { id: 'weapon', label: 'Armas' },
        { id: 'knife', label: 'Facas' },
        { id: 'gloves', label: 'Luvas' }
    ];

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRarity = filterRarity === 'all' || item.rarity === filterRarity;
        
        let matchesType = true;
        const typeLower = item.type?.toLowerCase() || '';
        if (filterType === 'knife') matchesType = typeLower.includes('knife');
        else if (filterType === 'gloves') matchesType = typeLower.includes('gloves');
        else if (filterType === 'weapon') matchesType = !typeLower.includes('knife') && !typeLower.includes('gloves');

        return matchesSearch && matchesRarity && matchesType;
    });

    const totalValueBRL = items.reduce((acc, item) => acc + (item.price || 0), 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div className="p-6 text-white min-h-screen">
            {/* Header section com Filtros */}
            <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-shrink-0">
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                        <Box className="text-green-500 w-8 h-8" />
                        SEU INVENTÁRIO
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                            {filteredItems.length} de {items.length} itens encontrados
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 flex-grow max-w-4xl">
                    {/* Barra de Busca */}
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar skin..."
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-green-500/50 transition-all backdrop-blur-md text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filtro de Categorias */}
                    <div className="flex gap-1 bg-zinc-900/50 p-1 border border-white/10 rounded-xl backdrop-blur-md overflow-x-auto no-scrollbar shadow-inner">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterType(cat.id)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                    filterType === cat.id 
                                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtro de Raridade */}
                    <div className="relative min-w-[180px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <select
                            value={filterRarity}
                            onChange={(e) => setFilterRarity(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-green-500/50 transition-all backdrop-blur-md text-[10px] font-black appearance-none cursor-pointer uppercase text-zinc-300"
                        >
                            <option value="all">Todas Raridades</option>
                            {rarities.sort().map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/5 border border-green-500/20 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingCart className="w-12 h-12" />
                    </div>
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">Valor Estimado</p>
                    <h2 className="text-2xl font-black text-white">{totalValueBRL > 0 ? formatCurrency(totalValueBRL) : 'Consultando...'}</h2>
                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Mercado da Steam (Base)
                    </p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">Resultados</p>
                    <h2 className="text-2xl font-black text-white">{filteredItems.length} Itens</h2>
                    <p className="text-[10px] text-zinc-600 mt-1">Filtrados de {items.length} no total</p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">Facas & Luvas</p>
                    <h2 className="text-2xl font-black text-white">
                        {items.filter(i => i.type?.toLowerCase().includes('knife') || i.type?.toLowerCase().includes('gloves')).length}
                    </h2>
                    <p className="text-[10px] text-zinc-600 mt-1">Colecionáveis de prestígio</p>
                </div>
            </div>

            {/* Grid de Itens */}
            {filteredItems.length > 0 ? (
                <motion.div
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.assetid}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ y: -5 }}
                                className="relative group bg-zinc-900/60 border border-white/5 rounded-2xl p-4 overflow-hidden hover:border-white/20 transition-all shadow-lg"
                            >
                                {/* Indicador de Raridade */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
                                    style={{ backgroundColor: `#${item.rarity_color}` }}
                                />

                                {/* Ações de Visualização (Hover) */}
                                <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                    {item.inspect_url && (
                                        <a
                                            href={item.inspect_url}
                                            title="Inspecionar no Jogo"
                                            className="p-2 bg-black/80 hover:bg-green-500 text-white hover:text-black rounded-lg transition-colors border border-white/10 shadow-xl"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {item.market_url && (
                                        <a
                                            href={item.market_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Ver no Mercado Steam"
                                            className="p-2 bg-black/80 hover:bg-blue-500 text-white rounded-lg transition-colors border border-white/10 shadow-xl"
                                        >
                                            <ShoppingCart className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>

                                <div className="aspect-square mb-4 relative flex items-center justify-center p-2">
                                    <img
                                        src={item.icon_url}
                                        alt={item.name}
                                        className="w-full h-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-500 relative z-10"
                                    />

                                    {/* Brilho da Raridade */}
                                    <div
                                        className="absolute inset-0 opacity-10 blur-3xl rounded-full scale-150"
                                        style={{ backgroundColor: `#${item.rarity_color}` }}
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex justify-between items-start gap-1">
                                        <p
                                            className="text-[9px] font-black uppercase truncate flex-grow leading-none"
                                            style={{ color: `#${item.rarity_color}` }}
                                        >
                                            {item.rarity?.replace('Rarity_', '')?.replace('_Weapon', '')?.replace('Rarity_Custom_', '')}
                                        </p>
                                        {item.price && (
                                            <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap shadow-sm">
                                                {formatCurrency(item.price)}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-[10px] sm:text-[11px] font-bold text-zinc-100 leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-white transition-colors">
                                        {item.market_name}
                                    </h4>
                                    <div className="pt-2 border-t border-white/5 mt-1">
                                        <p className="text-[8px] text-zinc-600 font-bold truncate uppercase tracking-tighter">
                                            {item.type}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-20 text-center backdrop-blur-sm">
                    <Box className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhum item encontrado</p>
                    <p className="text-zinc-600 text-xs mt-2">Tente ajustar seus filtros ou busca.</p>
                    <button 
                        onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterRarity('all'); }}
                        className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase transition-all border border-white/10"
                    >
                        Resetar Filtros
                    </button>
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
