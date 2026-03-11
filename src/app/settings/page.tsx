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

export default function SettingsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        faceitNickname: "",
        steamMatchAuthCode: "",
        steamLatestMatchCode: "",
    });

    const [uiPrefs, setUiPrefs] = useState({
        showStats: true,
        compactMode: false,
        notifications: true,
    });

    useEffect(() => {
        if (session) {
            setLoading(true);
            fetch('/api/user')
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setFormData({
                            faceitNickname: data.faceitNickname || "",
                            steamMatchAuthCode: data.steamMatchAuthCode || "",
                            steamLatestMatchCode: data.steamLatestMatchCode || "",
                        });
                    }
                })
                .catch(err => console.error("Error fetching user data:", err))
                .finally(() => setLoading(false));
        }
    }, [session]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        try {
            const res = await fetch('/api/matches', {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                alert("Erro ao salvar configurações");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading && session) return <div className="p-20 text-center text-zinc-500 animate-pulse font-black uppercase tracking-widest">Carregando configurações...</div>;
    if (!session) return <div className="p-20 text-center text-zinc-500 uppercase font-black tracking-widest">Acesso restrito</div>;

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-12 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Settings className="text-cyan-500" /> Configurações
                    </h1>
                    <p className="text-zinc-500 text-xs font-bold uppercase mt-1 tracking-widest px-1">Gerencie seu perfil e integrações</p>
                </div>

                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                        >
                            <CheckCircle2 size={14} /> Salvo com Sucesso
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-12 gap-8"
            >
                {/* Integrações */}
                <div className="md:col-span-12">
                    <section className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <Share2 size={20} className="text-cyan-500" /> Integrações e Sincronização
                        </h2>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 px-2 tracking-widest">Faceit Nickname</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={formData.faceitNickname}
                                            onChange={(e) => setFormData({ ...formData, faceitNickname: e.target.value })}
                                            placeholder="Ex: weslao_skin"
                                            className="w-full bg-white/5 border border-white/5 focus:border-cyan-500/50 outline-none rounded-2xl px-5 py-4 text-sm font-bold transition-all placeholder:text-zinc-700"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-cyan-500/50 transition-colors">
                                            <Activity size={18} />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-zinc-600 px-2 leading-relaxed">Usado para buscar seu ELO e histórico do Faceit.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 px-2 tracking-widest">Steam Match Auth Code</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={formData.steamMatchAuthCode}
                                            onChange={(e) => setFormData({ ...formData, steamMatchAuthCode: e.target.value })}
                                            placeholder="Ex: XXXX-XXXXX-XXXX"
                                            className="w-full bg-white/5 border border-white/5 focus:border-cyan-500/50 outline-none rounded-2xl px-5 py-4 text-sm font-bold transition-all placeholder:text-zinc-700"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-cyan-500/50 transition-colors">
                                            <Shield size={18} />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-zinc-600 px-2 leading-relaxed">
                                        Necessário para carregar suas partidas oficiais da Valve.
                                        <a
                                            href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-500 hover:underline ml-1"
                                        >
                                            Obter código na Steam
                                        </a>
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-10 py-4 rounded-[20px] font-black uppercase text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-3 disabled:opacity-50 active:scale-95"
                                >
                                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </section>
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
                            <h3 className="text-lg font-black italic uppercase tracking-tighter mb-2">Sua Conta</h3>
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
            <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${active ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </div>
    );
}
