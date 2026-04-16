"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';

export default function RedirectPage() {
    const [mounted, setMounted] = useState(false);
    const serverIp = '103.14.27.41:27272';
    const serverPassword = '091867';
    const connectUrl = `steam://connect/${serverIp}/${serverPassword}`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const command = `connect ${serverIp}; password ${serverPassword}`;
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        setMounted(true);
        // Redireciona imediatamente
        window.location.href = connectUrl;
    }, [connectUrl]);

    if (!mounted) return null;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
            {/* Efeitos de fundo combinando com a TropaCS */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px]" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 text-center space-y-8 p-8"
            >
                <div className="flex justify-center">
                    <div className="relative">
                        <Loader2 className="w-20 h-20 text-yellow-500 animate-spin opacity-20" />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-yellow-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                        CONECTANDO AO <span className="text-yellow-500">SERVIDOR</span>
                    </h1>
                    <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">
                        O Steam abrirá automaticamente em instantes...
                    </p>
                </div>

                <div className="pt-8 space-y-4 max-w-sm mx-auto">
                    <p className="text-zinc-400 text-sm">
                        Caso o jogo não abra, clique no botão abaixo para tentar novamente ou use o comando no console.
                    </p>
                    
                    <a 
                        href={connectUrl}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-xl shadow-yellow-500/10"
                    >
                        Abrir Manualmente <ExternalLink size={16} />
                    </a>

                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-left relative group transition-all hover:bg-zinc-900/80">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Comando Console:</p>
                        <div className="flex items-center justify-between gap-3">
                            <code className="text-[11px] text-yellow-500/80 font-mono break-all leading-tight">
                                connect {serverIp}; password {serverPassword}
                            </code>
                            <button
                                onClick={handleCopy}
                                className="flex-shrink-0 p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-yellow-500 active:scale-90"
                                title="Copiar comando"
                            >
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <footer className="absolute bottom-12 text-center opacity-30">
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.5em]">TropaCS • Security Verified</p>
            </footer>
        </div>
    );
}
