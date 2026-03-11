"use client";

import SyncCenter from "@/components/dashboard/sync-center";
import { useSession } from "next-auth/react";

export default function SyncPage() {
    const { data: session } = useSession();

    if (!session) {
        return (
            <div className="p-20 text-center text-zinc-500 uppercase font-black">
                FAÇA LOGIN PARA CONFIGURAR A SINCRONIZAÇÃO
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-black italic tracking-tighter uppercase">Sincronização de Histórico</h1>
                <p className="text-zinc-500">Vincule suas contas para importar partidas e estatísticas automaticamente.</p>
            </div>
            <SyncCenter onSync={() => { }} />
        </div>
    );
}
