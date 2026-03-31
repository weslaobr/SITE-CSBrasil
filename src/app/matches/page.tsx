"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Swords, RefreshCw, Search, ExternalLink, ChevronLeft,
    ChevronRight, X, Target, Crosshair, Trophy, Clock,
    Calendar, Activity, Zap, Shield, TrendingUp, BarChart3
} from "lucide-react";
// Removed MatchReviewModal
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
            // 1. Fetch from Local Legacy API
            const resLocal = await fetch('/api/matches');
            const dataLocal = await resLocal.json();
            const legacyMatches = dataLocal.matches || [];

            // 2. Fetch from New Tracker API (FastAPI)
            let trackerMatches = [];
            try {
                const resTracker = await fetch('http://localhost:8000/api/match/list');
                if (resTracker.ok) {
                    const rawTracker = await resTracker.json();
                    trackerMatches = rawTracker.map((m: any) => ({
                        ...m,
                        id: m.id, // match_id
                        result: m.result === 'Win' ? 'Win' : m.result === 'Loss' ? 'Loss' : 'Tie',
                        mapName: m.map_name,
                        matchDate: m.parsed_at, // Use parse date as proxy if match date missing
                        kills: m.kills || 0,
                        deaths: m.deaths || 0,
                        assists: m.assists || 0,
                        adr: m.adr,
                        kast: m.kast,
                        rating2: m.rating,
                        isTracker: true
                    }));
                }
            } catch (err) {
                console.warn("Tracker API not available:", err);
            }

            // 3. Merge & Deduplicate
            // Map legacy matches into a map by ID
            const matchesMap = new Map();
            legacyMatches.forEach((m: any) => matchesMap.set(m.id, m));

            // Overwrite with Tracker matches (or add if new)
            trackerMatches.forEach((m: any) => {
                const existing = matchesMap.get(m.id);
                matchesMap.set(m.id, { ...existing, ...m });
            });

            const merged = Array.from(matchesMap.values()).sort((a, b) => 
                new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
            );

            setMatches(merged);
        } catch (e) {
            console.error("Match fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            await fetch('/api/sync/all', { method: 'POST' });
            await fetchMatches();
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setLoading(false);
        }
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
                currentFaceit={(session.user as any)?.faceitNickname || ''}
                currentUserSteamId={(session.user as any)?.steamId || ''}
            />
        </div>
    );
}
