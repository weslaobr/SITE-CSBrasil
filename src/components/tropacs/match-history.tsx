import React from 'react';
import MatchesDashboard from '@/components/dashboard/matches-dashboard';
import { Lock } from 'lucide-react';

interface MatchHistoryProps {
    matches: any[];
    onReview?: (id: string) => void;
    onSync?: () => void;
    loading?: boolean;
    steamId?: string;
    steamNickname?: string;
}

export default function MatchHistory({ matches, onSync, loading, steamId, steamNickname }: MatchHistoryProps) {
    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/40 border border-white/5 rounded-3xl backdrop-blur-md">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-500">
                    <Lock size={32} />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Histórico Vazio ou Privado</h3>
                <p className="text-zinc-500 text-sm max-w-md mb-8">
                    Este jogador ainda não possui partidas registradas no banco de dados do TropaCS. Para atualizar os dados e carregar o histórico diretamente do CS2, o perfil precisa ser sincronizado manualmente pela primeira vez.
                </p>
                {onSync && (
                    <button 
                        onClick={onSync}
                        disabled={loading}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
                    >
                        {loading ? 'Sincronizando...' : 'Sincronizar Partidas Agora'}
                    </button>
                )}
            </div>
        );
    }

    const mappedMatches = matches.map((m: any) => {
        const id = m.id || m.externalId || m.matchId;
        const source = m.source || m.data_source || 'mix';
        
        return {
            id: id,
            externalId: m.externalId || m.matchId || m.id,
            source: source,
            gameMode: m.gameMode || (['mix', 'demo', 'local'].some(s => source.toLowerCase().includes(s)) ? 'Mix' : 'Competitive'),
            mapName: m.mapName || m.map_name || m.map || 'Desconhecido',
            kills: m.kills ?? m.totalKills ?? 0,
            deaths: m.deaths ?? m.totalDeaths ?? 0,
            assists: m.assists ?? m.totalAssists ?? 0,
            hsPercentage: m.hsPercentage ?? m.headshot_pct ?? m.hs_percentage ?? 0,
            adr: m.adr ?? m.metadata?.adr ?? 0,
            totalDamage: m.totalDamage ?? m.total_damage ?? 0,
            kast: m.kast,
            scoreA: m.scoreA ?? m.team1Score ?? m.team_3_score ?? 0,
            scoreB: m.scoreB ?? m.team2Score ?? m.team_2_score ?? 0,
            matchDate: m.matchDate || m.finished_at || m.date || new Date().toISOString(),
            result: (() => {
            const res = (m.result || '').toLowerCase();
            const out = (m.outcome || '').toLowerCase();
            
            // Strictly trust existing result fields from API/Sync
            if (res === 'win' || out === 'win' || res === 'vitoria' || res === 'vitória') return 'Win';
            if (res === 'loss' || out === 'loss' || res === 'derrota') return 'Loss';
            if (res === 'tie' || out === 'tie' || res === 'draw' || res === 'empate') return 'Draw';

            return 'Draw';
        })(),
        score: typeof m.score === 'string' 
            ? m.score 
            : (Array.isArray(m.score) ? `${m.score[0]}-${m.score[1]}` : '0-0'),
        rank: m.rank || m.metadata?.rank || m.metadata?.skill_level || null,
        eloChange: m.eloChange,
        eloAfter: m.eloAfter,
        metadata: m.metadata || {
            leetify_rating: m.leetify_rating
        }
        }
    });

    return (
        <MatchesDashboard 
            variant="profile" 
            matches={mappedMatches}
            currentFaceit={steamNickname || ""}
            onUpdateFaceit={() => {}}
            onSync={onSync}
            loading={loading}
            currentUserSteamId={steamId}
        />
    );
}
