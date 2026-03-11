"use client";

import MatchesDashboard from "@/components/dashboard/matches-dashboard";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function MatchesPage() {
    const { data: session } = useSession();
    const [matches, setMatches] = useState<any[]>([]);
    const [faceitNickname, setFaceitNickname] = useState('');
    const [loading, setLoading] = useState(false);

    const syncMatches = () => {
        setLoading(true);
        fetch('/api/sync/all', { method: 'POST' })
            .then(res => res.json())
            .then(() => {
                fetchMatches();
            })
            .catch(err => {
                console.error("Sync error:", err);
                setLoading(false);
            });
    };

    const fetchMatches = () => {
        setLoading(true);
        fetch('/api/matches')
            .then(res => res.json())
            .then(data => {
                console.log("Fetched matches count:", data.count);
                setMatches(data.matches || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Matches fetch error:", err);
                setLoading(false);
            });
    };

    const handleUpdateFaceit = (nickname: string) => {
        fetch('/api/matches', {
            method: 'POST',
            body: JSON.stringify({ faceitNickname: nickname }),
            headers: { 'Content-Type': 'application/json' }
        }).then(() => {
            fetchMatches();
        });
    };

    useEffect(() => {
        if (session) {
            fetch('/api/user/sync')
                .then(res => res.json())
                .then(data => {
                    setFaceitNickname(data.faceitNickname || '');
                });
            fetchMatches();
        }
    }, [session]);

    if (!session) {
        return (
            <div className="p-20 text-center text-zinc-500 uppercase font-black">
                FAÇA LOGIN PARA VER SEU HISTÓRICO DE PARTIDAS
            </div>
        );
    }

    return (
        <div className="p-0 md:p-8">
            <MatchesDashboard
                matches={matches}
                currentFaceit={faceitNickname}
                onUpdateFaceit={handleUpdateFaceit}
                onSync={syncMatches}
                loading={loading}
            />
        </div>
    );
}
