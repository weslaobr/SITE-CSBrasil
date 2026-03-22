import React from 'react';
import MatchesDashboard from '@/components/dashboard/matches-dashboard';

interface MatchHistoryProps {
    matches: any[];
    onReview?: (id: string) => void;
}

export default function MatchHistory({ matches }: MatchHistoryProps) {
    // We map the various possible data shapes (Leetify raw, DB match, etc) 
    // to the unified Match format expected by MatchesDashboard
    const mappedMatches = matches.map((m: any) => ({
        id: m.id,
        externalId: m.externalId || m.id,
        source: m.source || m.data_source || 'Leetify',
        gameMode: m.gameMode || 'Competitive',
        mapName: m.mapName || m.map_name || 'Desconhecido',
        kills: m.kills || 0,
        deaths: m.deaths || 0,
        assists: m.assists || 0,
        hsPercentage: m.hsPercentage || m.hs_percentage || 0,
        adr: m.adr || 0,
        matchDate: m.matchDate || m.finished_at || new Date().toISOString(),
        result: m.result || (m.outcome === 'win' ? 'Win' : m.outcome === 'loss' ? 'Loss' : 'Draw'),
        score: typeof m.score === 'string' 
            ? m.score 
            : (Array.isArray(m.score) ? `${m.score[0]}-${m.score[1]}` : '0-0'),
        metadata: m.metadata || {
            leetify_rating: m.leetify_rating
        }
    }));

    return (
        <MatchesDashboard 
            variant="profile" 
            matches={mappedMatches}
            currentFaceit=""
            onUpdateFaceit={() => {}}
        />
    );
}
