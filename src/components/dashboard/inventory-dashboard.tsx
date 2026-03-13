"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Box, Eye, ShoppingCart, Info, Loader2, DollarSign, Check, X, RefreshCw } from 'lucide-react';

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
    exterior_label?: string;
    price?: number | null;
    paidPrice?: number | null;
    inspect_url?: string | null;
    market_url?: string | null;
}

const InventoryDashboard: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterRarity, setFilterRarity] = useState('all');
    const [language, setLanguage] = useState<'pt' | 'en'>('pt');
    const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
    const [showRoiAssetId, setShowRoiAssetId] = useState<string | null>(null);
    const [localItems, setLocalItems] = useState<InventoryItem[]>(items);
    const [exchangeRate, setExchangeRate] = useState<{ rate: number; bcbRate: number; updatedAt: string } | null>(null);

    useEffect(() => { setLocalItems(items); }, [items]);

    useEffect(() => {
        fetch('/api/exchange-rate')
            .then(r => r.json())
            .then(d => setExchangeRate(d))
            .catch(() => {});
    }, []);

    const handleLanguageChange = (lang: 'pt' | 'en') => {
        setLanguage(lang);
        setCurrency(lang === 'pt' ? 'BRL' : 'USD');
    };

    // ── Raridades ──
    const RARITY_MAP: Record<string, { color: string; pt: string; en: string }> = {
        'Common':     { color: 'b0c3d9', pt: 'Comum',          en: 'Common' },
        'Uncommon':   { color: '5e98d9', pt: 'Incomum',        en: 'Uncommon' },
        'Rare':       { color: '4b69ff', pt: 'Raro',           en: 'Rare' },
        'Mythical':   { color: '8847ff', pt: 'Mítico',         en: 'Mythical' },
        'Legendary':  { color: 'd32ce6', pt: 'Lendário',       en: 'Legendary' },
        'Ancient':    { color: 'eb4b4b', pt: 'Antigo',         en: 'Ancient' },
        'Contraband': { color: 'e4ae39', pt: 'Contrabandeado', en: 'Contraband' },
    };
    const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Mythical', 'Legendary', 'Ancient', 'Contraband'];

    const normalizeRarity = (rarity: string): string =>
        rarity.replace('Rarity_', '').replace('_Weapon', '').replace('_Character', '').replace('_Default', '');

    const translateRarity = (rarity: string) => {
        if (!rarity) return '';
        const key = normalizeRarity(rarity);
        return RARITY_MAP[key]?.[language] || key;
    };

    const canonicalRaritiesInInventory = RARITY_ORDER.filter(key =>
        localItems.some(i => normalizeRarity(i.rarity || '') === key)
    );

    const rarityCounts = canonicalRaritiesInInventory.reduce((acc, key) => {
        acc[key] = localItems.filter(i => normalizeRarity(i.rarity || '') === key).length;
        return acc;
    }, {} as Record<string, number>);

    // ── Categorias ──
    const categories = [
        { id: 'all',        label: language === 'pt' ? 'Todos'         : 'All' },
        { id: 'knife',      label: language === 'pt' ? 'Facas'         : 'Knives' },
        { id: 'gloves',     label: language === 'pt' ? 'Luvas'         : 'Gloves' },
        { id: 'rifle',      label: language === 'pt' ? 'Rifles'        : 'Rifles' },
        { id: 'pistol',     label: language === 'pt' ? 'Pistolas'      : 'Pistols' },
        { id: 'smg',        label: 'SMGs' },
        { id: 'sniper',     label: 'Snipers' },
        { id: 'shotgun',    label: language === 'pt' ? 'Escopetas'     : 'Shotguns' },
        { id: 'machinegun', label: language === 'pt' ? 'Metralhadoras' : 'Machineguns' },
        { id: 'agent',      label: language === 'pt' ? 'Agentes'       : 'Agents' },
        { id: 'container',  label: language === 'pt' ? 'Caixas'        : 'Cases' },
        { id: 'sticker',    label: language === 'pt' ? 'Adesivos'      : 'Stickers' },
        { id: 'collectible',label: language === 'pt' ? 'Colecionáveis' : 'Collectibles' },
    ];

    // ── Filtro ──
    const filteredItems = localItems.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            item.name_pt?.toLowerCase().includes(searchLower) ||
            item.name_en?.toLowerCase().includes(searchLower) ||
            item.name.toLowerCase().includes(searchLower);

        const matchesRarity = filterRarity === 'all' || normalizeRarity(item.rarity || '') === filterRarity;

        let matchesType = true;
        if (filterType !== 'all') {
            const typeLower = item.type?.toLowerCase() || '';
            const catInternal = item.category_internal?.toLowerCase() || '';
            const nameLower = item.name_en?.toLowerCase() || '';
            switch (filterType) {
                case 'knife':      matchesType = typeLower.includes('knife') || catInternal.includes('knife'); break;
                case 'gloves':     matchesType = typeLower.includes('gloves') || catInternal.includes('gloves') || typeLower.includes('hands') || nameLower.includes('gloves'); break;
                case 'rifle':      matchesType = typeLower.includes('rifle') && !nameLower.includes('awp') && !nameLower.includes('scar-20') && !nameLower.includes('g3sg1') && !nameLower.includes('ssg 08'); break;
                case 'pistol':     matchesType = typeLower.includes('pistol') || catInternal.includes('pistol'); break;
                case 'smg':        matchesType = typeLower.includes('smg') || catInternal.includes('smg'); break;
                case 'sniper':     matchesType = nameLower.includes('awp') || nameLower.includes('scar-20') || nameLower.includes('g3sg1') || nameLower.includes('ssg 08') || typeLower.includes('sniper'); break;
                case 'shotgun':    matchesType = typeLower.includes('shotgun') || catInternal.includes('shotgun'); break;
                case 'machinegun': matchesType = typeLower.includes('machinegun') || catInternal.includes('machinegun'); break;
                case 'agent':      matchesType = typeLower.includes('agent') || catInternal.includes('agent') || typeLower.includes('character') || typeLower.includes('customplayer') || catInternal.includes('customplayer'); break;
                case 'container':  matchesType = typeLower.includes('container') || catInternal.includes('container') || typeLower.includes('case') || typeLower.includes('supply') || catInternal.includes('supply'); break;
                case 'sticker':    matchesType = typeLower.includes('sticker') || catInternal.includes('sticker'); break;
                case 'collectible':matchesType = typeLower.includes('collectible') || catInternal.includes('collectible') || typeLower.includes('pin'); break;
            }
        }
        return matchesSearch && matchesRarity && matchesType;
    });

    // ── Valores ──
    const totalValueUSD = localItems.reduce((acc, item) => acc + (item.price || 0), 0);
    const totalValueBRL = exchangeRate ? totalValueUSD * exchangeRate.rate : 0;
    const totalValue    = currency === 'BRL' ? totalValueBRL : totalValueUSD;

    const formatCurrency = (usdValue: number) => {
        if (currency === 'BRL' && exchangeRate) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usdValue * exchangeRate.rate);
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdValue);
    };

    const handleSavePaidPrice = async (assetId: string, marketHashName: string, price: string) => {
        try {
            // Remove símbolos R$, $, espaços e troca vírgula por ponto
            const cleanPrice = price.replace(/[R$\s]/g, '').replace(',', '.');
            const numericPrice = parseFloat(cleanPrice);
            const finalPrice = price.trim() === '' ? null : numericPrice;
            if (finalPrice !== null && isNaN(finalPrice)) return;

            // paidPrice é SEMPRE armazenado em USD internamente
            // Se o usuário está em modo BRL, precisa converter o valor digitado para USD
            let priceInUSD: number | null = finalPrice;
            if (finalPrice !== null && currency === 'BRL' && exchangeRate) {
                priceInUSD = finalPrice / exchangeRate.rate;
            }

            setLocalItems(prev => prev.map(item =>
                item.assetid === assetId ? { ...item, paidPrice: priceInUSD } : item
            ));

            const response = await fetch('/api/inventory/save-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId, marketHashName, paidPrice: priceInUSD })
            });

            if (!response.ok) {
                setLocalItems(prev => prev.map(item =>
                    item.assetid === assetId ? { ...item, paidPrice: items.find(i => i.assetid === assetId)?.paidPrice || null } : item
                ));
            }
        } catch {
            setLocalItems(prev => prev.map(item =>
                item.assetid === assetId ? { ...item, paidPrice: items.find(i => i.assetid === assetId)?.paidPrice || null } : item
            ));
        }
    };

    return (
        <div className="p-4 md:p-8 text-white min-h-screen space-y-6">

            {/* ── ROW 1: Título + Controls ── */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                {/* Título */}
                <div className="flex-shrink-0">
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <Box className="text-green-500 w-9 h-9 flex-shrink-0" />
                        {language === 'pt' ? 'SEU INVENTÁRIO' : 'YOUR INVENTORY'}
                    </h1>
                    <p className="text-zinc-500 text-sm font-semibold mt-1 ml-12">
                        {filteredItems.length} {language === 'pt' ? 'de' : 'of'} <span className="text-zinc-300">{localItems.length}</span> {language === 'pt' ? 'itens' : 'items'}
                    </p>
                </div>

                {/* Barra de Ferramentas Unificada (Toolbar) */}
                <div className="flex flex-col md:flex-row items-stretch gap-0 bg-zinc-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
                    
                    {/* Barra de Busca Integradada */}
                    <div className="relative flex-grow flex items-center border-b md:border-b-0 md:border-r border-white/5">
                        <Search className="absolute left-5 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder={language === 'pt' ? "Buscar skin..." : "Search skin..."}
                            className="bg-transparent py-4 pl-14 pr-5 focus:outline-none text-sm w-full placeholder:text-zinc-600 transition-all focus:bg-white/[0.02]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Grupo de Toggles e Cotação */}
                    <div className="flex flex-wrap items-center bg-white/[0.01] p-1.5 gap-1">
                        
                        {/* Seletor PT/EN */}
                        <div className="flex gap-0.5 bg-black/40 rounded-2xl p-0.5 border border-white/5">
                            <button
                                onClick={() => handleLanguageChange('pt')}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                                    language === 'pt'
                                        ? 'bg-zinc-100 text-black shadow-lg shadow-white/5'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <span className="text-sm">🇧🇷</span>
                                <span>PT</span>
                            </button>
                            <button
                                onClick={() => handleLanguageChange('en')}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                                    language === 'en'
                                        ? 'bg-zinc-100 text-black shadow-lg shadow-white/5'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <span className="text-sm">🇺🇸</span>
                                <span>EN</span>
                            </button>
                        </div>

                        {/* Switch de Moeda */}
                        <button
                            onClick={() => setCurrency(c => c === 'BRL' ? 'USD' : 'BRL')}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all"
                        >
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-all ${
                                currency === 'BRL' ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/10 text-zinc-400 group-hover:text-white'
                            }`}>R$</span>
                            <RefreshCw className="w-3 h-3 text-zinc-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-all ${
                                currency === 'USD' ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/10 text-zinc-400 group-hover:text-white'
                            }`}>USD</span>
                        </button>

                        {/* Cotação Estilo "Status Pill" */}
                        {exchangeRate && (
                            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/20 border border-white/5 font-mono">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter">Live</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                                </span>
                                <div className="h-3 w-px bg-white/10" />
                                <span className="text-[11px] text-zinc-400 font-bold">1 $ = R$ {exchangeRate.rate.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── ROW 2: Filtro de Raridade ── */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest mr-1 hidden sm:block">
                    {language === 'pt' ? 'Raridade' : 'Rarity'}
                </span>
                <button
                    onClick={() => setFilterRarity('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                        filterRarity === 'all'
                            ? 'bg-white/10 text-white border-white/20 shadow-md'
                            : 'bg-zinc-900/60 text-zinc-500 border-white/5 hover:text-white hover:border-white/10'
                    }`}
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-white/60" />
                    {language === 'pt' ? 'Todas' : 'All'}
                    <span className="font-mono text-zinc-500">{localItems.length}</span>
                </button>
                {canonicalRaritiesInInventory.map(key => {
                    const def = RARITY_MAP[key];
                    const isActive = filterRarity === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilterRarity(isActive ? 'all' : key)}
                            style={{
                                borderColor: isActive ? `#${def.color}60` : undefined,
                                boxShadow: isActive ? `0 0 14px #${def.color}20` : undefined,
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                                isActive
                                    ? 'text-white bg-zinc-900/80'
                                    : 'bg-zinc-900/60 text-zinc-500 border-white/5 hover:text-white hover:border-white/10'
                            }`}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `#${def.color}`, boxShadow: isActive ? `0 0 8px #${def.color}` : undefined }}
                            />
                            {def[language]}
                            <span className="font-mono" style={{ color: isActive ? `#${def.color}` : '#52525b' }}>
                                {rarityCounts[key]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── ROW 3: Categorias ── */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 bg-zinc-900/30 p-2 rounded-2xl border border-white/5">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setFilterType(cat.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap flex-shrink-0 border ${
                            filterType === cat.id
                                ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20 scale-105'
                                : 'bg-transparent text-zinc-500 border-transparent hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* ── ROW 4: Cards de Resumo ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Valor Estimado */}
                <div className="relative bg-zinc-900/50 border border-green-500/20 p-6 rounded-2xl overflow-hidden group backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full translate-x-8 -translate-y-8 group-hover:bg-green-500/10 transition-all duration-700" />
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Valor Estimado' : 'Estimated Value'}
                    </p>
                    <h2 className="text-3xl font-black text-white mb-1">
                        {totalValue > 0 ? formatCurrency(totalValueUSD) : (exchangeRate ? formatCurrency(0) : <span className="text-zinc-600 text-xl animate-pulse">Carregando...</span>)}
                    </h2>
                    {exchangeRate && (
                        <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
                            {currency === 'BRL' && totalValueUSD > 0 && (
                                <p className="text-sm text-zinc-400">
                                    ≈ <span className="font-bold text-zinc-300">${totalValueUSD.toFixed(2)} USD</span>
                                </p>
                            )}
                            {currency === 'USD' && totalValueBRL > 0 && (
                                <p className="text-sm text-zinc-400">
                                    ≈ <span className="font-bold text-zinc-300">R$ {totalValueBRL.toFixed(2)}</span>
                                </p>
                            )}
                            <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-mono">
                                <Info className="w-3 h-3" />
                                market.csgo.com · 1 USD = R$ {exchangeRate.rate.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Resultados */}
                <div className="relative bg-zinc-900/50 border border-white/5 p-6 rounded-2xl overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 blur-3xl rounded-full translate-x-8 -translate-y-8" />
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">
                        {language === 'pt' ? 'Resultados' : 'Results'}
                    </p>
                    <h2 className="text-3xl font-black text-white">
                        {filteredItems.length}
                        <span className="text-lg text-zinc-600 font-bold ml-2">{language === 'pt' ? 'itens' : 'items'}</span>
                    </h2>
                    <p className="text-sm text-zinc-600 mt-3 border-t border-white/5 pt-3">
                        {language === 'pt' ? `de ${localItems.length} total` : `of ${localItems.length} total`}
                        {filterRarity !== 'all' && (
                            <span className="ml-2 text-xs">· <button onClick={() => setFilterRarity('all')} className="text-green-400 hover:underline">
                                {language === 'pt' ? 'limpar' : 'clear'}
                            </button></span>
                        )}
                    </p>
                </div>

                {/* High Tier */}
                <div className="relative bg-zinc-900/50 border border-white/5 p-6 rounded-2xl overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/5 blur-3xl rounded-full translate-x-8 -translate-y-8" />
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">High Tier</p>
                    <h2 className="text-3xl font-black text-white">
                        {localItems.filter(i => ['Ancient', 'Legendary', 'Contraband'].includes(normalizeRarity(i.rarity || ''))).length}
                        <span className="text-lg text-zinc-600 font-bold ml-2">skins</span>
                    </h2>
                    <p className="text-sm text-zinc-600 mt-3 border-t border-white/5 pt-3">
                        {language === 'pt' ? 'Antigas, Lendárias e Contrabandeadas' : 'Ancient, Legendary & Contraband'}
                    </p>
                </div>
            </div>

            {/* ── Grid de Itens ── */}
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
                                    <button
                                        onClick={() => setShowRoiAssetId(showRoiAssetId === item.assetid ? null : item.assetid)}
                                        className={`p-2.5 rounded-xl border shadow-xl transition-all hover:scale-110 active:scale-95 ${
                                            item.paidPrice
                                                ? 'bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/40'
                                                : 'bg-black/90 text-white border-white/10 hover:bg-yellow-600'
                                        }`}
                                        title={language === 'pt' ? "Gerenciar Preço Pago" : "Manage Purchase Price"}
                                    >
                                        <DollarSign className={`w-4 h-4 ${showRoiAssetId === item.assetid ? 'animate-pulse' : ''}`} />
                                    </button>
                                </div>

                                <div className="aspect-square mb-4 relative flex items-center justify-center">
                                    <img src={item.icon_url} alt={item.name} className="w-full h-auto object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500 relative z-10" />
                                    <div className="absolute inset-0 opacity-10 blur-3xl" style={{ backgroundColor: `#${item.rarity_color}` }} />
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex justify-between items-start gap-1">
                                        <p className="text-[10px] font-bold uppercase truncate flex-grow" style={{ color: `#${item.rarity_color}` }}>
                                            {translateRarity(item.rarity)}
                                        </p>
                                        {item.price ? (
                                            <span
                                                className="text-[10px] font-black text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 cursor-default whitespace-nowrap"
                                                title={`USD $${item.price.toFixed(2)}${exchangeRate ? ` · R$ ${(item.price * exchangeRate.rate).toFixed(2)}` : ''}`}
                                            >
                                                {formatCurrency(item.price)}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-white/5">N/A</span>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-white/5">
                                        <h3 className="text-xs font-black text-white leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-green-400 transition-colors">
                                            {language === 'pt' ? (item.name_pt || item.name) : (item.name_en || item.name)}
                                        </h3>
                                        <div className="flex justify-between gap-1 items-center mt-1.5">
                                            <p className="text-[10px] text-zinc-500 font-semibold truncate uppercase">
                                                {(item.type_label && !item.type_label.includes('WEARCATEGORY')) ? item.type_label : (item.category_name && !item.category_name.includes('WEARCATEGORY') ? item.category_name : '')}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-semibold truncate uppercase">
                                                {(item.exterior_label && !item.exterior_label.includes('WEARCATEGORY')) ? item.exterior_label : ''}
                                            </p>
                                        </div>

                                        {/* ROI */}
                                        <AnimatePresence>
                                            {showRoiAssetId === item.assetid && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="bg-black/60 p-2 rounded-lg border border-yellow-500/20 mt-2 space-y-2 shadow-inner">
                                                         <div className="flex justify-between items-center gap-2">
                                                             <span className="text-xs text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                                                                 {language === 'pt' ? 'Preço Pago' : 'Paid Price'}
                                                                 <span className={`text-[9px] px-1 py-0.5 rounded font-black ${
                                                                     currency === 'BRL' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                                 }`}>{currency}</span>
                                                             </span>
                                                            <div className="flex items-center gap-1 bg-zinc-800/50 border border-white/5 rounded px-2 py-1">
                                                                <input
                                                                    id={`price-input-${item.assetid}`}
                                                                    type="text"
                                                                    defaultValue={item.paidPrice
                                                                        ? (currency === 'BRL' && exchangeRate
                                                                            ? (item.paidPrice * exchangeRate.rate).toFixed(2)
                                                                            : item.paidPrice.toFixed(2))
                                                                        : ''}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleSavePaidPrice(item.assetid, item.name_en || item.name, (e.target as HTMLInputElement).value);
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                    placeholder={currency === 'BRL' ? 'R$ 0,00' : '$ 0.00'}
                                                                    className="w-20 bg-transparent text-xs font-black text-right text-white focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const input = document.getElementById(`price-input-${item.assetid}`) as HTMLInputElement;
                                                                        if (input) handleSavePaidPrice(item.assetid, item.name_en || item.name, input.value);
                                                                    }}
                                                                    className="p-1 hover:text-green-400 text-zinc-400 transition-colors"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                {item.paidPrice && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const input = document.getElementById(`price-input-${item.assetid}`) as HTMLInputElement;
                                                                            if (input) input.value = '';
                                                                            handleSavePaidPrice(item.assetid, item.name_en || item.name, '');
                                                                        }}
                                                                        className="p-1 hover:text-red-400 text-zinc-500 transition-colors ml-1 border-l border-white/10"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {item.paidPrice && item.price ? (
                                                            <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                                <span className={`text-xs font-bold uppercase ${item.price > item.paidPrice ? 'text-green-500' : item.price < item.paidPrice ? 'text-red-500' : 'text-zinc-400'}`}>
                                                                    Resultado
                                                                </span>
                                                                <span className={`text-sm font-black ${item.price > item.paidPrice ? 'text-green-500' : item.price < item.paidPrice ? 'text-red-500' : 'text-zinc-400'}`}>
                                                                    {item.price > item.paidPrice ? '+' : ''}{formatCurrency(item.price - item.paidPrice)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-zinc-500 text-center italic">Informe o valor para calcular ROI</p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                    <button
                        onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterRarity('all'); }}
                        className="mt-6 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase border border-white/10 transition-all"
                    >
                        {language === 'pt' ? 'Resetar Filtros' : 'Reset Filters'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
