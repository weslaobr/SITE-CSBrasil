"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import MatchesDashboard from "@/components/dashboard/matches-dashboard";

export default function MatchesPage() {
    const { data: session } = useSession();
    const [matches,   setMatches]   = useState<any[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [syncing,   setSyncing]   = useState(false);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/matches');
            if (!res.ok) throw new Error("Failed to fetch matches");
            const data = await res.json();
            setMatches(data.matches || []);
        } catch (e) { 
            console.error("Error fetching matches:", e); 
        }
        finally { setLoading(false); }
    };

    const handleSync = async () => {
        const steamId = (session?.user as any)?.steamId;
        if (!steamId) return;
        setSyncing(true);
        try {
            await fetch('/api/sync/player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steamId })
            });
            await fetchMatches();
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchMatches();
        }
    }, [session]);

    return (
        <div className="min-h-screen bg-black text-white py-6">
            <div className="w-full px-6 lg:px-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Swords className="text-yellow-500" />
                            Minhas Partidas
                        </h1>
                        <p className="text-zinc-400 mt-1">Histórico completo de confrontos e desempenho</p>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        {syncing ? 'Sincronizando...' : `${matches.length} partidas`}
                    </div>
                </div>

                <MatchesDashboard 
                    matches={matches} 
                    loading={loading || syncing}
                    onSync={handleSync}
                />
            </div>
        </div>
    );
}
