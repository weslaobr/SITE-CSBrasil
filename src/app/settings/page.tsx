"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    Share2,
    Shield,
    User,
    Eye,
    Save,
    CheckCircle2,
    Activity,
    RefreshCw,
    LogOut
} from "lucide-react";
import SyncCenter from "@/components/dashboard/sync-center";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [uiPrefs, setUiPrefs] = useState({
        showStats: true,
        compactMode: false,
        notifications: true,
    });

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
    };

    if (status === "loading") return <div className="p-20 text-center text-zinc-500 animate-pulse font-black uppercase tracking-widest">Carregando...</div>;
    if (!session) return <div className="p-20 text-center text-zinc-500 uppercase font-black tracking-widest">Acesso restrito</div>;

    return (
        <div className="p-4 md:p-8 space-y-12 pb-20">
            {/* ── HERO HEADER ── */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
                            <Settings className="text-yellow-500 w-7 h-7 drop-shadow-[0_0_8px_rgba(246,203,2,0.6)]" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Configurações</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-yellow-500/40" />
                                Perfil & Integrações
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-zinc-500">Gerencie suas plataformas e preferências</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-12 gap-8"
            >
                {/* Integrações e Sincronização Unificada */}
                <div className="md:col-span-12">
                    <SyncCenter />
                </div>

                {/* Preferências */}
                <div className="md:col-span-7">
                    <section className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl h-full shadow-2xl shadow-black/50">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <Eye size={20} className="text-purple-500" /> Preferências de Interface
                        </h2>

                        <div className="space-y-6">
                            <PrefToggle
                                label="Exibir Estatísticas Públicas"
                                desc="Permitir que outros vejam seu ADR e Rank"
                                active={uiPrefs.showStats}
                                onToggle={() => setUiPrefs({ ...uiPrefs, showStats: !uiPrefs.showStats })}
                            />
                            <PrefToggle
                                label="Modo Compacto"
                                desc="Reduzir o tamanho dos elementos da UI"
                                active={uiPrefs.compactMode}
                                onToggle={() => setUiPrefs({ ...uiPrefs, compactMode: !uiPrefs.compactMode })}
                            />
                            <PrefToggle
                                label="Notificações do Mix"
                                desc="Avisar quando o lobby estiver pronto"
                                active={uiPrefs.notifications}
                                onToggle={() => setUiPrefs({ ...uiPrefs, notifications: !uiPrefs.notifications })}
                            />
                        </div>
                    </section>
                </div>

                {/* Conta Card */}
                <div className="md:col-span-5">
                    <section className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[40px] p-8 h-full flex flex-col justify-between min-h-[300px] shadow-2xl">
                        <div>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                                <User className="text-zinc-500" />
                            </div>
                            <h1 className="text-4xl font-black italic italic uppercase tracking-tighter mb-2">Configurações da Conta</h1>
                            <p className="text-xs text-zinc-500 font-bold leading-relaxed">Sua conta está vinculada permanentemente ao perfil Steam abaixo.</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <img src={session.user?.image || ""} className="w-10 h-10 rounded-full border border-white/10" alt="" />
                                <div>
                                    <p className="text-sm font-black uppercase italic tracking-tighter leading-none truncate max-w-[150px]">{session.user?.name}</p>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Status: Conectado</p>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="w-full py-4 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 group"
                            >
                                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Encerrar Sessão
                            </button>
                        </div>
                    </section>
                </div>
            </motion.div>
        </div>
    );
}

function PrefToggle({ label, desc, active, onToggle }: any) {
    return (
        <div className="flex justify-between items-center group cursor-pointer" onClick={onToggle}>
            <div>
                <p className="text-sm font-bold uppercase tracking-tight group-hover:text-white transition-colors">{label}</p>
                <p className="text-[10px] text-zinc-500 font-bold mt-0.5">{desc}</p>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${active ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </div>
    );
}
