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
                const steamId = (session?.user as any)?.steamId;
                const url = steamId ? `http://localhost:8000/api/match/list?steamid=${steamId}` : 'http://localhost:8000/api/match/list';
                const resTracker = await fetch(url);
                if (resTracker.ok) {
                    const rawTracker = await resTracker.json();
                    trackerMatches = rawTracker.map((m: any) => {
                        const sourceMode = (m.game_mode || '').toLowerCase();
                        let gameMode = 'Competitive';
                        
                        if (m.source === 'mix' || m.source === 'demo') {
                            gameMode = 'Mix';
                        } else if (sourceMode.includes('wingman') || sourceMode.includes('2v2')) {
                            gameMode = 'Wingman';
                        } else if (sourceMode.includes('premier') || (m.rating && m.rating > 1000)) {
                            gameMode = 'Premier';
                        }

                        return {
                            ...m,
                            id: m.match_id || m.id,
                            source: m.source || 'Tracker',
                            gameMode,
                            result: m.result === 'Win' ? 'Win' : m.result === 'Loss' ? 'Loss' : 'Tie',
                            mapName: m.map_name,
                            matchDate: m.parsed_at,
                            kills: m.kills || 0,
                            deaths: m.deaths || 0,
                            assists: m.assists || 0,
                            adr: m.adr || 0,
                            kast: m.kast !== undefined ? (m.kast > 1 ? Math.round(m.kast) : Math.round(m.kast * 100)) : null,
                            rating2: m.rating || 0,
                            rank: m.rank || m.skill_level || (gameMode === 'Premier' ? m.rating : null),
                            isTracker: true
                        };
                    });
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
                if (existing) {
                    matchesMap.set(m.id, {
                        ...existing,
                        ...m,
                        // Priority for stats: use tracker if > 0, else keep existing
                        kills: m.kills || existing.kills || 0,
                        deaths: m.deaths || existing.deaths || 0,
                        assists: m.assists || existing.assists || 0,
                        adr: m.adr || existing.adr,
                        kast: m.kast || existing.kast,
                        hsPercentage: m.hsPercentage || existing.hsPercentage
                    });
                } else {
                    matchesMap.set(m.id, m);
                }
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
