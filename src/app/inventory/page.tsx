"use client";

import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { Loader2, Package } from "lucide-react";

export default function InventoryPage() {
    const { data: session } = useSession();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pricingProgress, setPricingProgress] = useState<{ current: number; total: number } | null>(null);
    const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
    const [exchangeRate, setExchangeRate] = useState<any>(null);
    const pricingAbortRef = useRef<boolean>(false);

    useEffect(() => {
        fetch('/api/exchange-rate')
            .then(res => res.json())
            .then(json => setExchangeRate(json))
            .catch(console.error);
    }, []);

    useEffect(() => {
        // 1. Tentar carregar do cache local imediatamente
        const cachedData = localStorage.getItem('tropacs_inventory_cache');
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setItems(parsed);
                }
            } catch (e) {
                console.error("Erro ao ler cache do inventário:", e);
            }
        }

        if (session) {
            if (items.length === 0) setLoading(true);
            else setIsRefreshing(true);

            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    if (data.items) {
                        setItems(data.items);
                        localStorage.setItem('tropacs_inventory_cache', JSON.stringify(data.items));
                        // Iniciar busca progressiva de preços para itens sem preço
                        fetchMissingPrices(data.items);
                    }
                    setLoading(false);
                    setIsRefreshing(false);
                })
                .catch(() => {
                    setLoading(false);
                    setIsRefreshing(false);
                });
        }

        return () => { pricingAbortRef.current = true; };
    }, [session]);

    const fetchMissingPrices = async (loadedItems: any[]) => {
        pricingAbortRef.current = false;
        
        // Carregar cache de falhas (Negative Caching)
        const failedAttemptsRaw = localStorage.getItem('tropacs_failed_prices') || '{}';
        const failedAttempts = JSON.parse(failedAttemptsRaw);
        const now = Date.now();
        const FAIL_TTL = 6 * 60 * 60 * 1000; // 6 horas

        const itemsWithoutPrice = loadedItems.filter(i => {
            if (i.price || !i.name_en) return false;
            // Se falhou recentemente, ignorar nesta sessão
            const lastAttempt = failedAttempts[i.name_en];
            if (lastAttempt && (now - lastAttempt < FAIL_TTL)) return false;
            return true;
        });

        if (itemsWithoutPrice.length === 0) return;

        // Deduplica por name_en
        const uniqueItems = Array.from(
            new Map(itemsWithoutPrice.map(i => [i.name_en, i])).values()
        );

        setPricingProgress({ current: 0, total: uniqueItems.length });

        for (let i = 0; i < uniqueItems.length; i++) {
            if (pricingAbortRef.current) break;

            const item = uniqueItems[i];
            try {
                const res = await fetch('/api/prices/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marketHashName: item.name_en })
                });

                if (res.status === 429) {
                    // Rate limited — parar tentativas por agora
                    console.warn("[PriceLoader] Rate limit atingido. Pausando.");
                    break;
                }

                const data = await res.json();
                if (data.price) {
                    setItems(prev => {
                        const updated = prev.map(p =>
                            p.name_en === item.name_en ? { ...p, price: data.price } : p
                        );
                        localStorage.setItem('tropacs_inventory_cache', JSON.stringify(updated));
                        return updated;
                    });
                } else {
                    // Marcar como falha no cache para não tentar novamente tão cedo
                    failedAttempts[item.name_en] = Date.now();
                    localStorage.setItem('tropacs_failed_prices', JSON.stringify(failedAttempts));
                }
            } catch (e) {
                // Erro de rede/servidor - marcar como falha temporária
                failedAttempts[item.name_en] = Date.now();
                localStorage.setItem('tropacs_failed_prices', JSON.stringify(failedAttempts));
            }

            setPricingProgress({ current: i + 1, total: uniqueItems.length });

            // Delay entre requisições para evitar rate limit da Steam
            if (i < uniqueItems.length - 1 && !pricingAbortRef.current) {
                await new Promise(r => setTimeout(r, 1500 + Math.random() * 500));
            }
        }

        setPricingProgress(null);
    };

    if (!session) {
        return (
            <div className="p-20 text-center text-zinc-500 uppercase font-black">
                FAÇA LOGIN PARA VER SEU INVENTÁRIO
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 pb-24 space-y-8">

            {/* ── HERO HEADER ── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-inner">
                            <Package className="text-green-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Meu</span>
                                <span className="text-green-400"> Inventário</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-green-500/40" />
                                Steam Inventory
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-zinc-500">Skins, preços e valor total do inventário</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Indicador discreto de atualização em segundo plano */}
                {(isRefreshing || pricingProgress) && (
                    <div className="relative z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                        <div className="w-3.5 h-3.5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {pricingProgress
                                ? `Preços ${pricingProgress.current}/${pricingProgress.total}`
                                : 'Atualizando...'}
                        </span>
                    </div>
                )}
            </header>

            {loading && items.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                    <div className="text-zinc-500 font-black uppercase tracking-widest animate-pulse text-xs">
                        Buscando suas skins...
                    </div>
                </div>
            ) : (
                <InventoryDashboard
                    items={items}
                    currency={currency}
                    setCurrency={setCurrency}
                    exchangeRate={exchangeRate}
                />
            )}
        </div>
    );
}
