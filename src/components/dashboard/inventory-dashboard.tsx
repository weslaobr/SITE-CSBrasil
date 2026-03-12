"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Box, Eye, ShoppingCart, Info, ChevronDown, Loader2 } from 'lucide-react';

interface InventoryItem {
    assetid: string;
    name: string;
    name_pt?: string;
    name_en?: string;
    market_name: string;
    icon_url: string;
    rarity: string;
    rarity_color: string;
    type: string;
    type_label?: string;
    category_internal?: string;
    category_name?: string;
    exterior?: string;
    exterior_label?: string;
    price?: number | null;
    inspect_url?: string | null;
    market_url?: string | null;
}

const InventoryDashboard: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterRarity, setFilterRarity] = useState('all');
    const [language, setLanguage] = useState<'pt' | 'en'>('pt');

    // Extrair raridades únicas presentes no inventário
    const rarities = Array.from(new Set(items.map(i => i.rarity).filter(Boolean)));
    
    const categories = [
        { id: 'all', label: language === 'pt' ? 'Todos' : 'All' },
        { id: 'knife', label: language === 'pt' ? 'Facas' : 'Knives' },
        { id: 'gloves', label: language === 'pt' ? 'Luvas' : 'Gloves' },
        { id: 'rifle', label: language === 'pt' ? 'Rifles' : 'Rifles' },
        { id: 'pistol', label: language === 'pt' ? 'Pistolas' : 'Pistols' },
        { id: 'smg', label: language === 'pt' ? 'SMGs' : 'SMGs' },
        { id: 'sniper', label: language === 'pt' ? 'Snipers' : 'Snipers' },
        { id: 'shotgun', label: language === 'pt' ? 'Escopetas' : 'Shotguns' },
        { id: 'machinegun', label: language === 'pt' ? 'Metralhadoras' : 'Machineguns' },
        { id: 'agent', label: language === 'pt' ? 'Agentes' : 'Agents' },
        { id: 'container', label: language === 'pt' ? 'Caixas' : 'Cases' },
        { id: 'sticker', label: language === 'pt' ? 'Adesivos' : 'Stickers' },
        { id: 'collectible', label: language === 'pt' ? 'Colecionáveis' : 'Collectibles' }
    ];

    const rarityTranslations: Record<string, { pt: string, en: string }> = {
        'Common': { pt: 'Comum', en: 'Common' },
        'Uncommon': { pt: 'Incomum', en: 'Uncommon' },
        'Rare': { pt: 'Raro', en: 'Rare' },
        'Mythical': { pt: 'Mítico', en: 'Mythical' },
        'Legendary': { pt: 'Lendário', en: 'Legendary' },
        'Ancient': { pt: 'Antigo', en: 'Ancient' },
        'Contraband': { pt: 'Contrabandeado', en: 'Contraband' }
    };

    const translateRarity = (rarity: string) => {
        if (!rarity) return '';
        const clean = rarity
            .replace('Rarity_', '')
            .replace('_Weapon', '')
            .replace('_Character', '')
            .replace('Rarity_Custom_', '');
        return rarityTranslations[clean]?.[language] || clean;
    };

    const filteredItems = items.filter(item => {
        // 1. Busca
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            item.name_pt?.toLowerCase().includes(searchLower) || 
            item.name_en?.toLowerCase().includes(searchLower) ||
            item.name.toLowerCase().includes(searchLower);

        // 2. Raridade
        const matchesRarity = filterRarity === 'all' || item.rarity === filterRarity;
        
        // 3. Tipo (Lógica Robusta usando Internal Name)
        let matchesType = true;
        if (filterType !== 'all') {
            const typeLower = item.type?.toLowerCase() || '';
            const catInternal = item.category_internal?.toLowerCase() || '';
            const nameLower = item.name_en?.toLowerCase() || '';

            switch (filterType) {
                case 'knife': matchesType = typeLower.includes('knife') || catInternal.includes('knife'); break;
                case 'gloves': matchesType = typeLower.includes('gloves') || catInternal.includes('gloves') || typeLower.includes('hands') || catInternal.includes('hands') || nameLower.includes('gloves'); break;
                case 'rifle': matchesType = typeLower.includes('rifle') || (catInternal.includes('rifle') && !nameLower.includes('awp') && !nameLower.includes('scar-20') && !nameLower.includes('g3sg1') && !nameLower.includes('ssg 08')); break;
                case 'pistol': matchesType = typeLower.includes('pistol') || catInternal.includes('pistol'); break;
                case 'smg': matchesType = typeLower.includes('smg') || catInternal.includes('smg'); break;
                case 'sniper': matchesType = nameLower.includes('awp') || nameLower.includes('scar-20') || nameLower.includes('g3sg1') || nameLower.includes('ssg 08') || typeLower.includes('sniper'); break;
                case 'shotgun': matchesType = typeLower.includes('shotgun') || catInternal.includes('shotgun'); break;
                case 'machinegun': matchesType = typeLower.includes('machinegun') || catInternal.includes('machinegun'); break;
                case 'agent': matchesType = typeLower.includes('agent') || catInternal.includes('agent') || typeLower.includes('character') || catInternal.includes('character'); break;
                case 'container': matchesType = typeLower.includes('container') || catInternal.includes('container') || typeLower.includes('case'); break;
                case 'sticker': matchesType = typeLower.includes('sticker') || catInternal.includes('sticker'); break;
                case 'collectible': matchesType = typeLower.includes('collectible') || catInternal.includes('collectible') || typeLower.includes('pin'); break;
            }
        }

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
            <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex-shrink-0">
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                        <Box className="text-green-500 w-8 h-8" />
                        {language === 'pt' ? 'SEU INVENTÁRIO' : 'YOUR INVENTORY'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                            {filteredItems.length} {language === 'pt' ? 'de' : 'of'} {items.length} {language === 'pt' ? 'itens encontrados' : 'items found'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 flex-grow max-w-5xl lg:justify-end">
                    {/* Barra de Busca */}
                    <div className="relative flex-grow md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder={language === 'pt' ? "Buscar skin..." : "Search skin..."}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-green-500/50 transition-all backdrop-blur-md text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Botão de Idioma */}
                    <div className="flex bg-zinc-900/50 p-1 border border-white/10 rounded-xl backdrop-blur-md shadow-inner self-start">
                        <button
                            onClick={() => setLanguage('pt')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                                language === 'pt' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <span className="text-sm">🇧🇷</span> PT
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                                language === 'en' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <span className="text-sm">🇺🇸</span> EN
                        </button>
                    </div>

                    {/* Filtro de Raridade */}
                    <div className="relative min-w-[180px] self-start">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <select
                            value={filterRarity}
                            onChange={(e) => setFilterRarity(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-green-500/50 transition-all backdrop-blur-md text-[10px] font-black appearance-none cursor-pointer uppercase text-zinc-300"
                        >
                            <option value="all">{language === 'pt' ? 'Todas Raridades' : 'All Rarities'}</option>
                            {rarities.sort().map(r => (
                                <option key={r} value={r}>{translateRarity(r)}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Sub-Header: Categorias (Scroll Horizontal) */}
            <div className="mb-10 flex gap-2 overflow-x-auto no-scrollbar pb-2 bg-zinc-900/20 p-2 rounded-2xl border border-white/5 shadow-inner">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setFilterType(cat.id)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap flex-shrink-0 border ${
                            filterType === cat.id 
                            ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20 scale-105' 
                            : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/5 border border-green-500/20 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingCart className="w-12 h-12" />
                    </div>
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">{language === 'pt' ? 'Valor Estimado' : 'Estimated Value'}</p>
                    <h2 className="text-2xl font-black text-white">{totalValueBRL > 0 ? formatCurrency(totalValueBRL) : '...'}</h2>
                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Steam Market
                    </p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">{language === 'pt' ? 'Resultados' : 'Results'}</p>
                    <h2 className="text-2xl font-black text-white">{filteredItems.length} {language === 'pt' ? 'Itens' : 'Items'}</h2>
                    <p className="text-[10px] text-zinc-600 mt-1">{language === 'pt' ? `Filtrados de ${items.length}` : `Filtered from ${items.length}`}</p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">High Tier</p>
                    <h2 className="text-2xl font-black text-white">
                        {items.filter(i => i.rarity === 'Rarity_Ancient' || i.rarity === 'Rarity_Legendary').length}
                    </h2>
                    <p className="text-[10px] text-zinc-600 mt-1">{language === 'pt' ? 'Skins Raras' : 'Rare Skins'}</p>
                </div>
            </div>

            {/* Grid de Itens */}
            {filteredItems.length > 0 ? (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: `#${item.rarity_color}` }} />

                                {/* Ações */}
                                <div className="absolute top-3 right-3 flex flex-col gap-2.5 z-20 opacity-40 group-hover:opacity-100 transition-all duration-300">
                                    {item.inspect_url && (
                                        <a 
                                            href={item.inspect_url} 
                                            className="p-2.5 bg-black/90 hover:bg-green-600 text-white rounded-xl border border-white/10 hover:border-green-400/50 shadow-xl transition-all hover:scale-110 active:scale-95"
                                            title={language === 'pt' ? "Inspecionar no Jogo" : "Inspect in Game"}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </a>
                                    )}
                                    {item.market_url && (
                                        <a 
                                            href={item.market_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-2.5 bg-black/90 hover:bg-blue-600 text-white rounded-xl border border-white/10 hover:border-blue-400/50 shadow-xl transition-all hover:scale-110 active:scale-95"
                                            title={language === 'pt' ? "Ver no Mercado Steam" : "View on Steam Market"}
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>

                                <div className="aspect-square mb-4 relative flex items-center justify-center">
                                    <img src={item.icon_url} alt={item.name} className="w-full h-auto object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500 relative z-10" />
                                    <div className="absolute inset-0 opacity-10 blur-3xl" style={{ backgroundColor: `#${item.rarity_color}` }} />
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex justify-between items-start gap-1">
                                        <p className="text-[9px] font-black uppercase truncate flex-grow" style={{ color: `#${item.rarity_color}` }}>
                                            {translateRarity(item.rarity)}
                                        </p>
                                        {item.price && (
                                            <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                {formatCurrency(item.price)}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-[10px] sm:text-[11px] font-bold text-zinc-100 leading-tight line-clamp-2 min-h-[2.4em]">
                                        {language === 'pt' ? item.name_pt : item.name_en}
                                    </h4>
                                    <div className="pt-2 border-t border-white/5 mt-1 flex justify-between gap-2">
                                        <p className="text-[8px] text-zinc-600 font-bold truncate uppercase">
                                            {(item.type_label && !item.type_label.includes('WEARCATEGORY')) ? item.type_label : (item.category_name && !item.category_name.includes('WEARCATEGORY') ? item.category_name : '')}
                                        </p>
                                        <p className="text-[8px] text-zinc-400 font-bold truncate uppercase">
                                            {(item.exterior_label && !item.exterior_label.includes('WEARCATEGORY')) ? item.exterior_label : ''}
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
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">{language === 'pt' ? 'Nenhum item encontrado' : 'No items found'}</p>
                    <button onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterRarity('all'); }} className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase border border-white/10">
                        {language === 'pt' ? 'Resetar Filtros' : 'Reset Filters'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
