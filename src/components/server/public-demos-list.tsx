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
}

export function PublicDemosList() {
    const [demos, setDemos] = useState<DemoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
    const [processingFile, setProcessingFile] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

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

    const handleProcess = async (file: DemoFile) => {
        setProcessingFile(file.name);
        setProcessingStatus(prev => ({ ...prev, [file.name]: 'loading' }));
        
        try {
            // 1. Get signed download URL
            const downloadRes = await fetch(`/api/server/demos/download?file=${encodeURIComponent(file.path)}`);
            if (!downloadRes.ok) throw new Error('Erro ao obter link da demo');
            const downloadData = await downloadRes.json();
            
            if (!downloadData.downloadUrl) throw new Error('Link de download não gerado');

            // 2. Send to processor
            const res = await fetch('/api/sync/manual-demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: downloadData.downloadUrl }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro no processamento');
            }

            setProcessingStatus(prev => ({ ...prev, [file.name]: 'success' }));
            setTimeout(() => setProcessingStatus(prev => ({ ...prev, [file.name]: 'idle' })), 5000);
        } catch (err: any) {
            console.error(err);
            setProcessingStatus(prev => ({ ...prev, [file.name]: 'error' }));
            setTimeout(() => setProcessingStatus(prev => ({ ...prev, [file.name]: 'idle' })), 5000);
        } finally {
            setProcessingFile(null);
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

    const filteredDemos = demos.filter(demo => 
        demo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDemoName = (name: string) => {
        let cleanName = name.replace(/\.dem$/i, '');
        
        // Try to extract date/time from MatchZy format: match_20240428_1530_de_dust2
        const dateMatch = cleanName.match(/(\d{8})_(\d{4})/);
        let timeDisplay = null;
        if (dateMatch) {
            const d = dateMatch[1];
            const t = dateMatch[2];
            timeDisplay = `${d.slice(6,8)}/${d.slice(4,6)} às ${t.slice(0,2)}:${t.slice(2,4)}`;
            cleanName = cleanName.replace(`match_${d}_${t}_`, '');
        }

        const mapMatch = cleanName.match(/(de_[a-zA-Z0-9]+|cs_[a-zA-Z0-9]+)/i);
        const map = mapMatch ? mapMatch[0] : null;
        
        if (map) {
            cleanName = cleanName.replace(map, '').replace(/[-_]+/g, ' ').trim();
        } else {
            cleanName = cleanName.replace(/[-_]+/g, ' ').trim();
        }

        return {
            title: cleanName || "Partida",
            mapDisplay: map ? map.replace(/^(de_|cs_)/i, '').charAt(0).toUpperCase() + map.replace(/^(de_|cs_)/i, '').slice(1) : null,
            timeDisplay
        };
    };

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
                            placeholder="Buscar partida..."
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
                <div className="flex flex-col gap-3 pb-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredDemos
                        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
                        .map((demo, index, array) => {
                            let showSeparator = false;
                            let gapText = "";
                            if (index > 0) {
                                const prevDate = new Date(array[index - 1].modifiedAt).getTime();
                                const currDate = new Date(demo.modifiedAt).getTime();
                                const diffHours = (prevDate - currDate) / (1000 * 60 * 60);
                                if (diffHours > 4) {
                                    showSeparator = true;
                                    if (diffHours > 48) {
                                        gapText = `Jogos de ${Math.floor(diffHours / 24)} dias atrás`;
                                    } else if (diffHours > 24) {
                                        gapText = `Jogos do dia anterior`;
                                    } else {
                                        gapText = `Sessões Anteriores (+${Math.floor(diffHours)}h atrás)`;
                                    }
                                }
                            }

                            return (
                                <React.Fragment key={demo.name}>
                                    {showSeparator && (
                                        <div className="flex items-center gap-4 mt-6 mb-2">
                                            <div className="h-px bg-white/10 flex-1" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/50 px-4 py-1.5 rounded-full border border-white/5">{gapText}</span>
                                            <div className="h-px bg-white/10 flex-1" />
                                        </div>
                                    )}
                                    <div className="bg-zinc-900/40 border border-white/5 hover:border-yellow-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all">
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-zinc-600 group-hover:text-yellow-500 transition-colors border border-white/5 flex-shrink-0 mt-1">
                                                <FileText size={24} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-black text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">
                                                        {formatDemoName(demo.name).title}
                                                    </p>
                                                    {formatDemoName(demo.name).mapDisplay && (
                                                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase flex-shrink-0">
                                                            {formatDemoName(demo.name).mapDisplay}
                                                        </span>
                                                    )}
                                                    {formatDemoName(demo.name).timeDisplay && (
                                                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase flex-shrink-0">
                                                            {formatDemoName(demo.name).timeDisplay}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-mono text-zinc-600 break-all leading-relaxed">
                                                    <span className="text-zinc-500 font-bold">Original:</span> {demo.name}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-bold text-zinc-500 uppercase">
                                                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-zinc-600" /> {formatDate(demo.modifiedAt)}</span>
                                                    <span className="flex items-center gap-1.5"><HardDrive size={12} className="text-zinc-600" /> {formatSize(demo.size)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                            <button 
                                                onClick={() => handleProcess(demo)}
                                                disabled={processingFile === demo.name || downloadingFile === demo.name}
                                                className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto border ${
                                                    processingStatus[demo.name] === 'success' ? 'bg-green-600/10 text-green-400 border-green-500/20' :
                                                    processingStatus[demo.name] === 'error' ? 'bg-red-600/10 text-red-400 border-red-500/20' :
                                                    'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/20'
                                                }`}
                                            >
                                                {processingFile === demo.name ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : processingStatus[demo.name] === 'success' ? (
                                                    <Check size={16} />
                                                ) : processingStatus[demo.name] === 'error' ? (
                                                    <FileWarning size={16} />
                                                ) : (
                                                    <Zap size={16} />
                                                )}
                                                {processingFile === demo.name ? 'Processando...' : 
                                                 processingStatus[demo.name] === 'success' ? 'Enviado!' :
                                                 processingStatus[demo.name] === 'error' ? 'Falhou' : 'Processar'}
                                            </button>

                                            <button 
                                                onClick={() => handleDownload(demo)}
                                                disabled={downloadingFile === demo.name || processingFile === demo.name}
                                                className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto border border-white/5"
                                            >
                                                {downloadingFile === demo.name ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Download size={16} />
                                                )}
                                                {downloadingFile === demo.name ? 'Gerando...' : 'Baixar'}
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
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
