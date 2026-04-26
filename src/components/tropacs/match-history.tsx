import React from 'react';
import MatchesDashboard from '@/components/dashboard/matches-dashboard';
import { Lock } from 'lucide-react';

interface MatchHistoryProps {
    matches: any[];
    onReview?: (id: string) => void;
    onSync?: () => void;
    loading?: boolean;
}

export default function MatchHistory({ matches, onSync, loading }: MatchHistoryProps) {
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

    const mappedMatches = matches.map((m: any) => ({
        id: m.id || m.externalId,
        externalId: m.externalId || m.id,
        source: m.source || m.data_source || 'mix',
        gameMode: m.gameMode || (['mix', 'demo', 'local'].some(s => (m.source || '').toLowerCase().includes(s)) ? 'Mix' : 'Competitive'),
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
        rank: m.rank || m.metadata?.rank || m.metadata?.skill_level || null,
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
            onSync={onSync}
            loading={loading}
        />
    );
}
