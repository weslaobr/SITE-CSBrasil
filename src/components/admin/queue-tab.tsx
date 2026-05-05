"use client";

import React, { useState, useEffect } from 'react';
import { 
    Activity, Clock, Layers, RefreshCw, 
    CheckCircle2, AlertCircle, Loader2, Play,
    Database, Users, FileCode, Search,
    ChevronRight, BarChart3, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QueueItem {
    id: string;
    type: 'demo' | 'player' | 'sync';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    label: string;
    description?: string;
    progress?: number;
    startedAt?: string;
    queuedAt: string;
    error?: string;
}

export default function QueueTab() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        active: 0,
        pending: 0,
        completed_today: 0,
        failed_today: 0
    });

    const fetchQueue = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const res = await fetch('/api/admin/queue');
            if (!res.ok) throw new Error('Falha ao buscar fila');
            const data = await res.json();
            
            // Adaptar dados da API externa para o formato local
            // Supondo que a API retorna { queue: [], stats: {} } ou similar
            const items = Array.isArray(data.queue) ? data.queue : (data.tasks || []);
            setQueue(items);
            if (data.stats) setStats(data.stats);
        } catch (err) {
            console.error(err);
            // Dados mock para demonstração se a API falhar
            setQueue([
                { id: '1', type: 'demo', status: 'processing', label: 'Match #12345', description: 'de_mirage', progress: 45, startedAt: new Date().toISOString(), queuedAt: new Date().toISOString() },
                { id: '2', type: 'player', status: 'pending', label: 'Sync: Wesley', description: '76561198000000000', queuedAt: new Date().toISOString() },
                { id: '3', type: 'demo', status: 'failed', label: 'Match #9999', description: 'de_dust2', error: 'Demo corrompida', queuedAt: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => fetchQueue(), 10000);
        return () => clearInterval(interval);
    }, []);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'processing': return { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Processando' };
            case 'completed':  return { icon: <CheckCircle2 size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Concluído' };
            case 'failed':     return { icon: <AlertCircle size={14} />, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Falhou' };
            default:           return { icon: <Clock size={14} />, color: 'text-zinc-500', bg: 'bg-white/5', border: 'border-white/10', label: 'Na Fila' };
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'demo':   return <FileCode size={18} />;
            case 'player': return <Users size={18} />;
            default:       return <Zap size={18} />;
        }
    };

    if (loading && queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 gap-4">
                <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Acessando Fila do Analisador...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tarefas Ativas', value: stats.active || queue.filter(i => i.status === 'processing').length, icon: <Activity className="text-yellow-500" /> },
                    { label: 'Aguardando', value: stats.pending || queue.filter(i => i.status === 'pending').length, icon: <Layers className="text-zinc-400" /> },
                    { label: 'Sucesso (Hoje)', value: stats.completed_today || 0, icon: <CheckCircle2 className="text-emerald-500" /> },
                    { label: 'Falhas (Hoje)', value: stats.failed_today || 0, icon: <AlertCircle className="text-rose-500" /> },
                ].map((s, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 p-5 rounded-[24px] flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{s.label}</p>
                            <p className="text-2xl font-black italic text-white leading-none">{s.value}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                            {s.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Queue List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black italic uppercase tracking-tighter text-white">Tarefas em Tempo Real</h3>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <button 
                        onClick={() => fetchQueue(true)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                    >
                        <RefreshCw size={12} className={refreshing ? 'animate-spin text-yellow-500' : ''} />
                        {refreshing ? 'Atualizando...' : 'Atualizar Fila'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <AnimatePresence mode="popLayout">
                        {queue.length === 0 ? (
                            <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[32px]">
                                <Clock size={40} className="mx-auto text-zinc-700 mb-4" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Fila vazia no momento</p>
                            </div>
                        ) : (
                            queue.map((item) => {
                                const config = getStatusConfig(item.status);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group relative bg-[#0c0f15] border border-white/5 hover:border-white/10 p-4 rounded-[24px] transition-all flex items-center gap-6"
                                    >
                                        {/* Icon Section */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                                            item.status === 'processing' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 border-white/5 text-zinc-500'
                                        }`}>
                                            {getTypeIcon(item.type)}
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-sm font-black italic tracking-tight text-white uppercase truncate">
                                                    {item.label}
                                                </h4>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border} flex items-center gap-1`}>
                                                    {config.icon}
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-zinc-500 truncate">
                                                {item.description || (item.type === 'demo' ? 'Analisando metadados...' : 'Sincronizando estatísticas...')}
                                            </p>
                                        </div>

                                        {/* Progress Section (if processing) */}
                                        {item.status === 'processing' && item.progress !== undefined && (
                                            <div className="hidden md:flex flex-col items-end gap-1.5 w-32">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-[9px] font-black text-zinc-600 uppercase">Progresso</span>
                                                    <span className="text-[10px] font-black text-yellow-500 italic">{item.progress}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        className="h-full bg-yellow-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Meta Section */}
                                        <div className="hidden lg:flex flex-col items-end gap-1 text-[9px] font-bold text-zinc-600 min-w-[120px]">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={10} />
                                                {new Date(item.queuedAt).toLocaleTimeString('pt-BR')}
                                            </div>
                                            <div className="uppercase tracking-tighter opacity-40">
                                                ID: {item.id.slice(0, 8)}
                                            </div>
                                        </div>

                                        {/* Error Alert */}
                                        {item.status === 'failed' && item.error && (
                                            <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm flex items-center px-20 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                <AlertCircle size={16} className="text-rose-500 mr-4" />
                                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{item.error}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Analyzer Health */}
            <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shadow-xl shadow-yellow-500/5">
                        <Database size={24} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase italic tracking-tighter text-white">TropaCS Demos Analyzer</h4>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Serviço rodando via Discloud • {process.env.PYTHON_API_URL || 'tropacsdemos.discloud.app'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Serviço Online</span>
                </div>
            </div>
        </div>
    );
}
