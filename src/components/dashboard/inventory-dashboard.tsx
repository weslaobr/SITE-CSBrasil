"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Box } from 'lucide-react';

interface InventoryItem {
    assetid: string;
    name: string;
    market_name: string;
    icon_url: string;
    rarity: string;
    rarity_color: string;
    type: string;
    price?: number | null;
}

const InventoryDashboard: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalValueBRL = items.reduce((acc, item) => acc + (item.price || 0), 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div className="p-6 text-white">
            {/* Header section */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                        <Box className="text-green-500 w-8 h-8" />
                        SEU INVENTÁRIO
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Exibindo {items.length} itens do CS2</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar skin ou faca..."
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-green-500/50 transition-all backdrop-blur-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/5 border border-green-500/20 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Valor Estimado</p>
                    <h2 className="text-2xl font-black text-white">{totalValueBRL > 0 ? formatCurrency(totalValueBRL) : 'Consultando...'}</h2>
                    <p className="text-[10px] text-zinc-400 mt-1">Baseado nos preços sugeridos pelo Mercado da Steam (Direto)</p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Total de Itens</p>
                    <h2 className="text-2xl font-black text-white">{items.length}</h2>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Itens Especiais</p>
                    <h2 className="text-2xl font-black text-white">
                        {items.filter(i => i.type?.includes('Knife') || i.type?.includes('Gloves')).length}
                    </h2>
                </div>
            </div>

            {/* Inventory Grid */}
            {filteredItems.length > 0 ? (
                <motion.div
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                >
                    <AnimatePresence>
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.assetid}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ y: -5 }}
                                className="relative group bg-zinc-900/60 border border-white/5 rounded-xl p-4 overflow-hidden hover:border-white/20 transition-all cursor-pointer"
                            >
                                {/* Rarity Indicator (Vertical bar) */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: `#${item.rarity_color}` }}
                                />

                                <div className="aspect-square mb-3 relative flex items-center justify-center">
                                    <img
                                        src={item.icon_url}
                                        alt={item.name}
                                        className="w-full h-auto object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                                    />

                                    {/* Rarity Glow */}
                                    <div
                                        className="absolute inset-0 opacity-10 blur-2xl rounded-full"
                                        style={{ backgroundColor: `#${item.rarity_color}` }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <p
                                            className="text-[10px] font-bold uppercase truncate"
                                            style={{ color: `#${item.rarity_color}` }}
                                        >
                                            {item.rarity}
                                        </p>
                                        {item.price && (
                                            <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-1.5 rounded">
                                                {formatCurrency(item.price)}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">{item.market_name}</h4>
                                    <p className="text-[10px] text-zinc-500">{item.type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-12 text-center">
                    <p className="text-zinc-500">Nenhum item encontrado no seu inventário de CS2.</p>
                    <p className="text-zinc-600 text-sm mt-2">Certifique-se de que seu inventário está como "Público" na Steam.</p>
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
