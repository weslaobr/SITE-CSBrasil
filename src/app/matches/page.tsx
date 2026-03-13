"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Swords, RefreshCw, Search, ExternalLink, ChevronLeft,
    ChevronRight, X, Target, Crosshair, Trophy, Clock,
    Calendar, Activity, Zap, Shield, TrendingUp, BarChart3
} from "lucide-react";
import MatchReviewModal from "@/components/csbrasil/match-review-modal";
import MatchesDashboard from "@/components/dashboard/matches-dashboard";

// ────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────

export default function MatchesPage() {
    const { data: session } = useSession();
    const [matches,   setMatches]   = useState<any[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/matches');
            const data = await res.json();
            setMatches(data.matches || []);
        } catch (e) { console.error(e); }
        finally     { setLoading(false); }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            await fetch('/api/sync/all', { method: 'POST' });
            await fetchMatches();
        } catch (e) { console.error(e); }
        finally     { setLoading(false); }
    };

    const handleUpdateFaceit = async (nickname: string) => {
        try {
            await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faceitNickname: nickname })
            });
            fetchMatches();
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if (session) fetchMatches(); }, [session]);

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 font-black uppercase tracking-widest">
                Faça login para ver seu histórico
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <MatchesDashboard 
                matches={matches}
                loading={loading}
                onSync={handleSync}
                onUpdateFaceit={handleUpdateFaceit}
                onSelectMatch={(id) => setSelectedId(id)}
                currentFaceit={(session.user as any)?.faceitNickname || ''}
            />

            {/* Full Match Review Modal for detailed analytics */}
            <MatchReviewModal 
                matchId={selectedId} 
                onClose={() => setSelectedId(null)} 
            />
        </div>
    );
}
