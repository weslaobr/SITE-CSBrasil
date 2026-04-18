"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, ExternalLink, ShieldCheck, Copy, Check, 
    Paintbrush, Server, Users, Play, Download,
    ArrowRight, Wifi, Zap
} from 'lucide-react';
import { PublicDemosList } from '@/components/server/public-demos-list';
import Link from 'next/link';

export default function ServidorPage() {
    const [mounted, setMounted] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [autoConnect, setAutoConnect] = useState(true);
    const serverIp = '103.14.27.41:27272';
    const serverPassword = '091867';
    const connectUrl = `steam://connect/${serverIp}/${serverPassword}`;
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');

    const handleCopy = () => {
        const command = `connect ${serverIp}; password ${serverPassword}`;
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const checkStatus = useCallback(async () => {
        try {
            // Simplified check - just see if we can hit the demos API (means server/api is up)
            const res = await fetch('/api/server/demos');
            setStatus(res.ok ? 'online' : 'offline');
        } catch {
            setStatus('offline');
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        checkStatus();
    }, [checkStatus]);

    useEffect(() => {
        if (!autoConnect || countdown <= 0) {
            if (autoConnect && countdown === 0) {
                window.location.href = connectUrl;
            }
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, autoConnect, connectUrl]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden pb-20">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-yellow-500/5 blur-[120px] pointer-events-none" />

            {/* Header section */}
            <div className="relative z-10 p-8 pt-12 max-w-6xl mx-auto space-y-12">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-yellow-500" />
                            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.3em]">Servidor Oficial</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                            TROPA <span className="text-yellow-500 text-glow">CS2</span>
                        </h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">A melhor experiência competitivo 5x5 do Brasil</p>
                    </motion.div>

                    {/* Auto-connect Banner */}
                    <AnimatePresence>
                        {autoConnect && countdown > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-yellow-500 text-black px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-yellow-500/10"
                            >
                                <div className="relative">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-[10px]">{countdown}</span>
                                </div>
                                <div>
                                    <p className="font-black uppercase text-[10px] leading-tight">Conectando ao jogo em {countdown}s</p>
                                    <button onClick={() => setAutoConnect(false)} className="text-[9px] font-bold uppercase border-b border-black/40 hover:border-black transition-colors">Cancelar</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT: Server Card & Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 space-y-8 backdrop-blur-xl"
                        >
                            {/* Server IP Display */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Endereço do Servidor</span>
                                    <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-[9px] font-black uppercase ${status === 'online' ? 'bg-green-500/10 text-green-500' : status === 'offline' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                        <Wifi size={10} className={status === 'online' ? 'animate-pulse' : ''} />
                                        {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Verificando...'}
                                    </div>
                                </div>

                                <div className="bg-black/60 border border-white/5 rounded-2xl p-4 group transition-all hover:bg-black/80">
                                    <div className="flex items-center justify-between gap-4">
                                        <code className="text-[13px] text-yellow-500/90 font-mono font-bold">{serverIp}</code>
                                        <button onClick={handleCopy} className="p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-yellow-500">
                                            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase mt-2">Senha: {serverPassword}</p>
                                </div>
                            </div>

                            {/* Main CTA */}
                            <div className="space-y-3">
                                <a 
                                    href={connectUrl}
                                    className="flex items-center justify-center gap-3 w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-[0.2em] rounded-[24px] transition-all active:scale-95 shadow-2xl shadow-yellow-500/20 group"
                                >
                                    Abrir no CS2 <Zap size={16} className="group-hover:fill-current" />
                                </a>
                                <p className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Requer Counter-Strike 2 instalado</p>
                            </div>

                            {/* Secondary Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                <Link href="/ranking" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group">
                                    <Users size={18} className="text-zinc-500 group-hover:text-yellow-500 transition-colors" />
                                    <span className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-white">Ver Ranking</span>
                                </Link>
                                <Link href="/inventory" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group">
                                    <Paintbrush size={18} className="text-zinc-500 group-hover:text-yellow-500 transition-colors" />
                                    <span className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-white">Minhas Skins</span>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Inventory Promo */}
                        <motion.div 
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: 0.1 }}
                             className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[40px] p-8 flex flex-col gap-4 relative overflow-hidden group"
                        >
                            <div className="relative z-10 space-y-2">
                                <h3 className="text-lg font-black italic uppercase tracking-tighter">Skins da Web</h3>
                                <p className="text-xs text-zinc-500 leading-relaxed">Personalize seu inventário no site e as skins aparecerão automaticamente ao entrar no servidor.</p>
                                <a href="https://inventory.cstrike.app/" target="_blank" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-yellow-500 mt-2 group-hover:gap-4 transition-all">
                                    Configurar Skins <ArrowRight size={12} />
                                </a>
                            </div>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
                                <Paintbrush size={100} />
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT: Demos Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 leading-none">
                                        ARQUIVO DE <span className="text-yellow-500">GRÁVAÇÕES</span>
                                    </h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2 px-1">Baixe demos dos jogos passados para assistir no seu CS2</p>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="bg-white/5 p-3 rounded-2xl">
                                        <Download size={20} className="text-zinc-600" />
                                    </div>
                                </div>
                            </div>

                            <PublicDemosList />
                        </motion.div>
                    </div>
                </div>

                <motion.footer 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ delay: 0.5 }}
                    className="text-center pt-8 border-t border-white/5"
                >
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.5em]">TropaCS • Competitivo Servers 2026</p>
                </motion.footer>
            </div>
        </div>
    );
}

