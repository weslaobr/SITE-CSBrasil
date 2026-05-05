"use client";

import React, { useState, useEffect } from 'react';
import { 
    Download, Clock, HardDrive, RefreshCw, 
    FileWarning, Loader2, Search, ExternalLink,
    ChevronRight, FileText
} from 'lucide-react';

interface DemoFile {
    name: string;
    size: number;
    mimetype: string;
    createdAt: string;
    modifiedAt: string;
    path: string;
}

export default function DemosTab() {
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
                // Abrir em nova aba para iniciar o download
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
            const downloadRes = await fetch(`/api/server/demos/download?file=${encodeURIComponent(file.path)}`);
            if (!downloadRes.ok) throw new Error('Erro ao obter link da demo');
            
            let downloadData;
            try {
                downloadData = await downloadRes.json();
            } catch (e) {
                throw new Error('Servidor retornou resposta inválida ao gerar link.');
            }
            
            if (!downloadData?.downloadUrl) throw new Error('Link de download não gerado');

            const res = await fetch('/api/sync/manual-demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: downloadData.downloadUrl }),
            });

            if (!res.ok) {
                let errorData;
                try {
                    errorData = await res.json();
                } catch (e) {
                    throw new Error(`Erro ${res.status}: Servidor de processamento indisponível.`);
                }
                throw new Error(errorData.error || errorData.details || 'Erro no processamento');
            }

            setProcessingStatus(prev => ({ ...prev, [file.name]: 'success' }));
            setTimeout(() => setProcessingStatus(prev => ({ ...prev, [file.name]: 'idle' })), 5000);
        } catch (err: any) {
            console.error('[AdminDemos]', err);
            setProcessingStatus(prev => ({ ...prev, [file.name]: 'error' }));
            alert(err.message); // Mostrar o erro para o usuário em vez de crashar
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
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Acessando servidor de arquivos...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Demos de Jogos</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Arquivos .dem gravados automaticamente no servidor
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Buscar demo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40 w-48 md:w-64 transition-all"
                        />
                    </div>
                    
                    <button 
                        onClick={fetchDemos}
                        className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/5 transition-all"
                        title="Atualizar lista"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                        <FileWarning size={20} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest">Erro de Conexão</p>
                            <p className="text-[10px] font-bold opacity-70 mt-0.5">{error}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 max-w-md leading-relaxed">
                        Não foi possível encontrar a pasta de demos no servidor. 
                        Verifique se o MatchZy está instalado e configurado para salvar demos em <code className="text-zinc-400">/csgo/MatchZy/demos</code>.
                    </p>
                    <button 
                        onClick={fetchDemos}
                        className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                        Tentar Novamente
                    </button>
                </div>
            ) : demos.length === 0 ? (
                <div className="bg-zinc-900/20 border border-dashed border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                        <FileText className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhuma demo encontrada</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Os jogos gravados aparecerão aqui automaticamente.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
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
                                        <div className="flex items-center gap-4 mt-8 mb-4">
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
                                                    <Check size={16} className="text-green-500" />
                                                ) : processingStatus[demo.name] === 'error' ? (
                                                    <FileWarning size={16} className="text-red-500" />
                                                ) : (
                                                    <RefreshCw size={16} />
                                                )}
                                                {processingFile === demo.name ? 'Processando...' : 
                                                 processingStatus[demo.name] === 'success' ? 'Enviado!' :
                                                 processingStatus[demo.name] === 'error' ? 'Falhou' : 'Analisar Demo'}
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
                                                {downloadingFile === demo.name ? 'Gerando...' : 'Download'}
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                </div>
            )}
            
            {/* Footer usage info */}
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <ExternalLink size={14} className="text-blue-500" />
                <p className="text-[10px] text-blue-500/80 font-bold uppercase tracking-wide">
                    Dica: Para assistir, coloque a demo na pasta <code className="bg-blue-500/10 px-1 rounded italic text-white">game/csgo</code> do seu jogo e use o comando <code className="bg-blue-500/10 px-1 rounded italic text-white">playdemo [nome]</code>.
                </p>
            </div>
        </div>
    );
}
