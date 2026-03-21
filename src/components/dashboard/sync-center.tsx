"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Gamepad2, Trophy, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncCenterProps {
    onSync?: () => void;
}

const SyncCenter: React.FC<SyncCenterProps> = ({ onSync }) => {
    const [syncData, setSyncData] = useState({
        steamMatchAuthCode: '',
        steamLatestMatchCode: '',
        faceitNickname: '',
        gcNickname: '',
        gcLevel: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [botOnline, setBotOnline] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const botUrl = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3005';
        const checkBot = () => {
            fetch(`${botUrl}/pulse`)
                .then(res => res.json())
                .then(data => setBotOnline(data.gc === 'Online'))
                .catch(() => setBotOnline(false));
        };
        checkBot();
        const interval = setInterval(checkBot, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch('/api/user/sync')
            .then(res => res.json())
            .then(data => {
                setSyncData({
                    steamMatchAuthCode: data.steamMatchAuthCode || '',
                    steamLatestMatchCode: data.steamLatestMatchCode || '',
                    faceitNickname: data.faceitNickname || '',
                    gcNickname: data.gcNickname || '',
                    gcLevel: data.gcLevel?.toString() || ''
                });
                setLoading(false);
            });
    }, []);

    const handleDeepSync = async () => {
        setIsSyncing(true);
        setSyncResult({ steam: 0, faceit: 0 });
        let currentSteamCode = '';
        let hasMoreMatches = true;

        try {
            // First pass for Faceit and initial Steam
            while (hasMoreMatches) {
                const res = await fetch('/api/matches/sync', {
                    method: 'POST',
                    body: JSON.stringify({ steamStartCode: currentSteamCode }),
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();

                if (res.ok) {
                    const newSteamCount = data.results?.steam || 0;
                    const newFaceitCount = data.results?.faceit || 0;

                    setSyncResult((prev: any) => ({
                        steam: (prev?.steam || 0) + newSteamCount,
                        faceit: (prev?.faceit || 0) + newFaceitCount
                    }));

                    currentSteamCode = data.nextSteamCode;
                    hasMoreMatches = data.hasMore && currentSteamCode;

                    if (newSteamCount > 0) {
                        setMessage({ type: 'success', text: `Sincronizando... Encontradas ${newSteamCount} novas partidas Steam.` });
                    }

                    if (!hasMoreMatches) {
                        setMessage({ type: 'success', text: 'Histórico completo sincronizado com sucesso!' });
                    }
                } else {
                    setMessage({ type: 'error', text: data.error || 'Falha na sincronização profunda.' });
                    hasMoreMatches = false;
                }

                // If onSync provided, update the UI (e.g. reload parent match list)
                if (onSync) onSync();

                // Add a 3-second delay between batches to avoid overloading Steam API
                if (hasMoreMatches) {
                    setMessage({ type: 'success', text: 'Pausando brevemente para evitar bloqueio da Steam...' });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao conectar ao servidor.' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSave = async (field: string) => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/sync', {
                method: 'POST',
                body: JSON.stringify({ [field]: syncData[field as keyof typeof syncData] }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Sincronizado com sucesso!' });
                if (onSync) onSync();
            } else {
                setMessage({ type: 'error', text: 'Erro ao sincronizar.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro de conexão.' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando Central de Sync...</div>;

    return (
        <div className="p-8 space-y-8 bg-zinc-900/20 rounded-3xl border border-white/5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <RefreshCw className={`text-yellow-500 w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
                        CENTRAL DE SINCRONIZAÇÃO
                    </h2>
                    <p className="text-zinc-500 text-sm">Conecte suas plataformas para unificar suas estatísticas e partidas.</p>
                </div>
                <div className="flex items-center gap-4">
                    {syncResult && (
                        <div className="text-[10px] font-bold uppercase space-x-3 text-zinc-400">
                            <span>Steam: <span className="text-white">{syncResult.steam || 0}</span></span>
                            <span>Faceit: <span className="text-white">{syncResult.faceit || 0}</span></span>
                        </div>
                    )}
                    <button
                        onClick={handleDeepSync}
                        disabled={isSyncing}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isSyncing
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 active:scale-95'
                            }`}
                    >
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
                    </button>
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                                }`}
                        >
                            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {message.text}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Steam Match History */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                            <Shield className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Steam Match History</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${botOnline ? 'bg-yellow-500 shadow-[0_0_8px_rgba(254,209,61,0.5)]' : 'bg-red-500'}`} />
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                    {botOnline ? 'GC Online' : 'GC Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Authentication Code</label>
                            <a
                                href="https://help.steampowered.com/pt-br/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                                target="_blank"
                                className="text-[9px] text-yellow-500 hover:underline font-bold uppercase"
                            >
                                Pegar Código
                            </a>
                        </div>
                        <input
                            type="text"
                            placeholder="Ex: ABCDE-12345"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-yellow-500 transition-all font-mono"
                            value={syncData.steamMatchAuthCode}
                            onChange={(e) => setSyncData({ ...syncData, steamMatchAuthCode: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Código Partida Recente (Pular para Hoje)</label>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">Opcional</span>
                        </div>
                        <input
                            type="text"
                            placeholder="CSGO-XXXXX-..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-yellow-500 transition-all font-mono"
                            value={syncData.steamLatestMatchCode}
                            onChange={(e) => setSyncData({ ...syncData, steamLatestMatchCode: e.target.value })}
                        />
                        <p className="text-[9px] text-zinc-600 italic">Dica: Coloque seu código de partida mais recente para sincronizar de hoje para trás!</p>
                    </div>
                    <button
                        onClick={() => {
                            handleSave('steamMatchAuthCode');
                            handleSave('steamLatestMatchCode');
                        }}
                        disabled={saving}
                        className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-xl transition-all"
                    >
                        Salvar Credenciais
                    </button>
                </div>

                {/* Faceit */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF5500]/20 rounded-xl flex items-center justify-center">
                            <Trophy className="text-[#FF5500] w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Faceit Network</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold text-[#FF5500]">Elo & Level Tracking</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Nickname</label>
                            <a
                                href="https://www.faceit.com/en/find/player"
                                target="_blank"
                                className="text-[9px] text-[#FF5500] hover:underline font-bold uppercase"
                            >
                                Encontrar Perfil
                            </a>
                        </div>
                        <input
                            type="text"
                            placeholder="Seu nick na Faceit"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-yellow-500 transition-all"
                            value={syncData.faceitNickname}
                            onChange={(e) => setSyncData({ ...syncData, faceitNickname: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={() => handleSave('faceitNickname')}
                        disabled={saving}
                        className="w-full bg-[#FF5500]/10 hover:bg-[#FF5500]/20 text-[#FF5500] text-xs font-bold py-2 rounded-xl transition-all"
                    >
                        Conectar Faceit
                    </button>
                </div>

                {/* Gamers Club */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                            <Gamepad2 className="text-yellow-500 w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Gamers Club</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold text-yellow-500">Level & Medalhas</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Nickname</label>
                                <a
                                    href="https://gamersclub.com.br/jogadores"
                                    target="_blank"
                                    className="text-[9px] text-yellow-500 hover:underline font-bold uppercase"
                                >
                                    Perfil
                                </a>
                            </div>
                            <input
                                type="text"
                                placeholder="Nick GC"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-yellow-500 transition-all"
                                value={syncData.gcNickname}
                                onChange={(e) => setSyncData({ ...syncData, gcNickname: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Level</label>
                            <input
                                type="number"
                                placeholder="1-21"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-yellow-500 transition-all"
                                value={syncData.gcLevel}
                                onChange={(e) => setSyncData({ ...syncData, gcLevel: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            handleSave('gcNickname');
                            handleSave('gcLevel');
                        }}
                        disabled={saving}
                        className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-xs font-bold py-2 rounded-xl transition-all"
                    >
                        Atualizar Gamers Club
                    </button>
                </div>
            </div>

            <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5 flex items-start gap-3">
                <AlertCircle className="text-zinc-500 w-5 h-5 mt-0.5" />
                <div className="text-[11px] text-zinc-500 leading-relaxed">
                    <p className="font-bold text-zinc-400 mb-1 uppercase tracking-wider">Como obter o Código de Autenticação da Steam?</p>
                    Para puxarmos suas partidas oficiais, você precisa acessar o link <a href="https://help.steampowered.com/pt-br/wizard/HelpWithGameIssue/?appid=730&issueid=128" target="_blank" className="text-yellow-500 hover:underline">Histórico de Jogos Pessoais</a> na Steam, ir em "Matches" e gerar seu código. Seus dados estão seguros conosco e são usados apenas para estatísticas.
                </div>
            </div>
        </div>
    );
};

export default SyncCenter;
