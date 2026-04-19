"use client";

import React, { useState, useEffect } from 'react';
import { 
    Download, Clock, HardDrive, RefreshCw, 
    FileWarning, Loader2, Search, ExternalLink,
    FileText, Calendar
} from 'lucide-react';

interface DemoFile {
    name: string;
    size: number;
    mimetype: string;
    createdAt: string;
    modifiedAt: string;
    path: string;
    matchInfo?: {
        id: string;
        mapName: string;
        score: string | null;
        players: string[];
    } | null;
}

export function PublicDemosList() {
    const [demos, setDemos] = useState<DemoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    useEffect(() => {
        fetchDemos();
    }, []);

    const fetchDemos = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/server/demos');
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao buscar demos do servidor');
            }
            const data = await res.json();
            setDemos(data.files || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (file: DemoFile) => {
        setDownloadingFile(file.name);
        try {
            const res = await fetch(`/api/server/demos/download?file=${encodeURIComponent(file.path)}`);
            if (!res.ok) throw new Error('Erro ao gerar link de download');
            
            const data = await res.json();
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDownloadingFile(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredDemos = demos.filter(demo => {
        const query = searchQuery.toLowerCase();
        const matchesName = demo.name.toLowerCase().includes(query);
        const matchesPlayers = demo.matchInfo?.players?.some(p => p.toLowerCase().includes(query));
        const matchesMap = demo.matchInfo?.mapName?.toLowerCase().includes(query);
        return matchesName || matchesPlayers || matchesMap;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Buscando arquivos de gravação...</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Calendar size={18} className="text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Demos Recentes</h3>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">Últimos jogos gravados no servidor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                        <input 
                            type="text"
                            placeholder="Buscar partida ou jogador..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40 w-full md:w-48 transition-all"
                        />
                    </div>
                    <button 
                        onClick={fetchDemos}
                        className="p-2 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-yellow-500 transition-all"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                    <FileWarning className="w-8 h-8 text-red-500/50" />
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{error}</p>
                    <button onClick={fetchDemos} className="text-[9px] bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Tentar Novamente</button>
                </div>
            ) : filteredDemos.length === 0 ? (
                <div className="bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center text-center gap-3">
                    <FileText className="w-8 h-8 text-zinc-700" />
                    <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Nenhuma demo disponível</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                    {filteredDemos.slice(0, 10).map((demo) => (
                        <div key={demo.name} className="bg-zinc-900/40 border border-white/5 hover:border-yellow-500/20 rounded-2xl p-4 flex flex-col gap-4 group transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-zinc-600 group-hover:text-yellow-500 transition-colors border border-white/5 flex-shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[11px] font-black text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight truncate max-w-[150px]">
                                                {demo.name.replace('.dem', '')}
                                            </p>
                                            {demo.matchInfo?.score && (
                                                <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded text-zinc-400">
                                                    {demo.matchInfo.score}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-zinc-500 uppercase">
                                            <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(demo.modifiedAt)}</span>
                                            <span className="flex items-center gap-1"><HardDrive size={10} /> {formatSize(demo.size)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleDownload(demo)}
                                    disabled={downloadingFile === demo.name}
                                    className="flex-shrink-0 p-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl transition-all shadow-lg shadow-yellow-500/10 active:scale-95 disabled:opacity-50"
                                >
                                    {downloadingFile === demo.name ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                </button>
                            </div>

                            {/* Player Preview Section */}
                            {demo.matchInfo?.players && demo.matchInfo.players.length > 0 && (
                                <div className="pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Users size={10} className="text-zinc-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Jogadores na Partida</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {demo.matchInfo.players.map((player, idx) => (
                                            <span key={idx} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                                                {player}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-start gap-4">
                <ExternalLink size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wide leading-relaxed">
                    As demos são excluídas automaticamente após 7 dias. Para assistir, coloque o arquivo na pasta <code className="bg-blue-500/10 px-1 rounded italic text-white normal-case">game/csgo</code> do seu jogo e use o comando <code className="bg-blue-500/10 px-1 rounded italic text-white normal-case">playdemo [nome]</code> no console.
                </p>
            </div>
        </div>
    );
}
