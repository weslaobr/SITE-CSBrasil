"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Swords, RefreshCw, Search, ExternalLink, ChevronLeft,
    ChevronRight, X, Target, Crosshair, Trophy, Clock,
    Calendar, Activity, Zap, Shield, TrendingUp, BarChart3
} from "lucide-react";
import MatchesDashboard from "@/components/dashboard/matches-dashboard";

export default function MatchesPage() {
    const { data: session } = useSession();
    const [matches,   setMatches]   = useState<any[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

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

    useEffect(() => {
        if (session) {
            fetchMatches();
        }
    }, [session]);

    return (
        <div className="min-h-screen bg-black text-white pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Swords className="text-yellow-500" />
                            Minhas Partidas
                        </h1>
                        <p className="text-zinc-400 mt-1">Histórico completo de confrontos e desempenho</p>
                    </div>
                    <button 
                        onClick={fetchMatches}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>

                <MatchesDashboard 
                    matches={matches} 
                    loading={loading}
                    onRefresh={fetchMatches}
                />
            </div>
        </div>
    );
}
