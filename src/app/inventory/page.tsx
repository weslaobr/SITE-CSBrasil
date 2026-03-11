"use client";

import InventoryDashboard from "@/components/dashboard/inventory-dashboard";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function InventoryPage() {
    const { data: session } = useSession();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session) {
            setLoading(true);
            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    if (data.items) {
                        setItems(data.items);
                    }
                    setLoading(false);
                })
                .catch(() => setLoading(false));
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
        <div className="p-0 md:p-8">
            {loading ? (
                <div className="p-20 text-center animate-pulse text-zinc-500 font-black uppercase">CARREGANDO SKINS...</div>
            ) : (
                <InventoryDashboard items={items} />
            )}
        </div>
    );
}
