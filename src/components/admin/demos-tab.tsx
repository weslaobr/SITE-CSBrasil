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
                <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Arquivo</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Tamanho</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Data de Gravação</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredDemos.map((demo) => (
                                <tr key={demo.name} className="group hover:bg-yellow-500/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-yellow-500 transition-colors border border-white/5">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">
                                                    {demo.name}
                                                </p>
                                                <p className="text-[9px] font-mono text-zinc-600 mt-0.5">csgo/MatchZy/demos/</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <HardDrive size={12} className="text-zinc-600" />
                                            <span className="text-[10px] font-mono">{formatSize(demo.size)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Clock size={12} className="text-zinc-600" />
                                            <span className="text-[10px] font-mono">{formatDate(demo.modifiedAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDownload(demo)}
                                            disabled={downloadingFile === demo.name}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {downloadingFile === demo.name ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Download size={12} />
                                            )}
                                            {downloadingFile === demo.name ? 'Gerando...' : 'Download'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
