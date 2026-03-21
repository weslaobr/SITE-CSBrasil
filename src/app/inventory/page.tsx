"use client";

import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
    const { data: session } = useSession();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pricingProgress, setPricingProgress] = useState<{ current: number; total: number } | null>(null);
    const pricingAbortRef = useRef<boolean>(false);

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
        <div className="p-0 md:p-8 relative">
            {/* Indicador discreto de atualização em segundo plano */}
            {(isRefreshing || pricingProgress) && (
                <div className="absolute top-4 right-8 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mx-auto" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {pricingProgress
                            ? `Buscando preços... ${pricingProgress.current}/${pricingProgress.total}`
                            : 'Atualizando...'}
                    </span>
                </div>
            )}

            {loading && items.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                    <div className="text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                        Buscando suas skins...
                    </div>
                </div>
            ) : (
                <InventoryDashboard items={items} />
            )}
        </div>
    );
}
