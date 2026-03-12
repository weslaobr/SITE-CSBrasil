"use client";

import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
    const { data: session } = useSession();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // 1. Tentar carregar do cache local imediatamente
        const cachedData = localStorage.getItem('csbrasil_inventory_cache');
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
            // Se já temos itens no cache, mostramos um status de "atualizando" discreto em vez de tela cheia
            if (items.length === 0) setLoading(true);
            else setIsRefreshing(true);

            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    if (data.items) {
                        setItems(data.items);
                        // Salvar no cache para a próxima vez
                        localStorage.setItem('csbrasil_inventory_cache', JSON.stringify(data.items));
                    }
                    setLoading(false);
                    setIsRefreshing(false);
                })
                .catch(() => {
                    setLoading(false);
                    setIsRefreshing(false);
                });
        }
    }, [session]);

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
            {isRefreshing && (
                <div className="absolute top-4 right-8 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <Loader2 className="w-3 h-3 text-green-500 animate-spin" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Atualizando...</span>
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
