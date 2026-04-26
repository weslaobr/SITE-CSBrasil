"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Eye, Users, Search, Target, Trophy, Info, Plus, User, Globe, Shield, Star, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { parseCrosshairCode } from '@/lib/crosshair-parser';

interface ProCrosshair {
    id: string;
    player: string;
    team: string;
    code: string;
    description: string;
    type: 'Classic' | 'Dot' | 'Large' | 'Small';
    color: string;
    previewStyle: {
        width: string;
        height: string;
        gap: string;
        thickness: string;
        dot: boolean;
        outline: boolean;
        color: string;
    };
}

interface CommunityCrosshair {
    id: string;
    name: string;
    code: string;
    description?: string;
    previewColor: string;
    previewSize: number;
    previewGap: number;
    previewThick: number;
    previewDot: boolean;
    user: {
        name: string;
        image: string;
    };
    createdAt: string;
}

const PRO_CROSSHAIRS: ProCrosshair[] = [
    {
        id: 'p1',
        player: 's1mple',
        team: 'NAVI',
        code: 'CSGO-fLY9e-E7onN-E6U6C-S6fD9-XU6YF',
        description: 'MIRA PEQUENA E PRECISA, IDEAL PARA HEADSHOTS.',
        type: 'Small',
        color: 'Cyan',
        previewStyle: { width: '4px', height: '1px', gap: '-1px', thickness: '1px', dot: false, outline: false, color: '#00ffff' }
    },
    {
        id: 'p2',
        player: 'ZywOo',
        team: 'Vitality',
        code: 'CSGO-iG7v6-7v6v6-7v6v6-7v6v6-7v6v6',
        description: 'MIRA VERDE PADRÃO, MUITO ESTÁVEL.',
        type: 'Classic',
        color: 'Green',
        previewStyle: { width: '6px', height: '2px', gap: '0px', thickness: '1px', dot: false, outline: true, color: '#00ff00' }
    },
    {
        id: 'p3',
        player: 'NiKo',
        team: 'G2',
        code: 'CSGO-UmY5Z-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'A MIRA DOS "ONE-TAPS". EXTREMAMENTE PEQUENA.',
        type: 'Small',
        color: 'White',
        previewStyle: { width: '3px', height: '1px', gap: '-2px', thickness: '1px', dot: false, outline: false, color: '#ffffff' }
    },
    {
        id: 'p4',
        player: 'FalleN',
        team: 'FURIA',
        code: 'CSGO-Tp6Yy-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'ESTILO CLÁSSICO DO PROFESSOR.',
        type: 'Classic',
        color: 'Green',
        previewStyle: { width: '5px', height: '2px', gap: '1px', thickness: '1px', dot: false, outline: false, color: '#00ff00' }
    },
    {
        id: 'p5',
        player: 'm0NESY',
        team: 'G2',
        code: 'CSGO-X78uY-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'MIRA DE SNIPER ÁGIL.',
        type: 'Small',
        color: 'Cyan',
        previewStyle: { width: '4px', height: '1.5px', gap: '-1px', thickness: '1px', dot: false, outline: false, color: '#00ffff' }
    },
    {
        id: 'p6',
        player: 'KSCERATO',
        team: 'FURIA',
        code: 'CSGO-VraAt-7v6v6-7v6v6-7v6v6-7v6v6',
        description: 'MIRA COMPACTA E MUITO VISÍVEL.',
        type: 'Small',
        color: 'Cyan',
        previewStyle: { width: '4px', height: '1px', gap: '-2px', thickness: '1px', dot: false, outline: true, color: '#00ffff' }
    },
    {
        id: 'p7',
        player: 'arT',
        team: 'FURIA',
        code: 'CSGO-X78uY-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'MIRA PARA JOGO AGRESSIVO.',
        type: 'Small',
        color: 'Yellow',
        previewStyle: { width: '4px', height: '1px', gap: '-1px', thickness: '1.5px', dot: false, outline: false, color: '#ffff00' }
    },
    {
        id: 'p8',
        player: 'Coldzera',
        team: 'Legacy',
        code: 'CSGO-X78uY-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'A MIRA DA LENDA DO JUMPING DOUBLE.',
        type: 'Classic',
        color: 'Green',
        previewStyle: { width: '5px', height: '2px', gap: '0px', thickness: '1px', dot: false, outline: false, color: '#00ff00' }
    },
    {
        id: 'p9',
        player: 'EliGE',
        team: 'Complexity',
        code: 'CSGO-fLY9e-E7onN-E6U6C-S6fD9-XU6YF',
        description: 'MIRA DE ALTA VISIBILIDADE.',
        type: 'Large',
        color: 'Yellow',
        previewStyle: { width: '8px', height: '2px', gap: '1px', thickness: '1.5px', dot: false, outline: true, color: '#ffff00' }
    },
    {
        id: 'p10',
        player: 'Twistzz',
        team: 'Liquid',
        code: 'CSGO-X78uY-8uY8u-8uY8u-8uY8u-8uY8u',
        description: 'LIMPA E PRECISA PARA HEADSHOTS.',
        type: 'Small',
        color: 'Cyan',
        previewStyle: { width: '3px', height: '1px', gap: '-2px', thickness: '1px', dot: false, outline: false, color: '#00ffff' }
    }
];

const CrosshairHub: React.FC = () => {
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState<'pros' | 'community'>('pros');
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [communityCrosshairs, setCommunityCrosshairs] = useState<CommunityCrosshair[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form state
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Preview state (user-controlled)
    const [prevColor, setPrevColor] = useState('#00ff00');
    const [prevSize, setPrevSize] = useState(5);
    const [prevGap, setPrevGap] = useState(0);
    const [prevThick, setPrevThick] = useState(1);
    const [prevDot, setPrevDot] = useState(false);

    const formPreviewStyle = {
        width: `${Math.max(1, prevSize)}px`,
        height: `${Math.max(1, prevSize)}px`,
        gap: `${prevGap}px`,
        thickness: `${Math.max(0.5, prevThick)}px`,
        dot: prevDot,
        outline: false,
        color: prevColor,
    };

    const fetchCommunity = async () => {
        setLoadingCommunity(true);
        try {
            const res = await fetch('/api/crosshairs');
            if (res.ok) setCommunityCrosshairs(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCommunity(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'community') fetchCommunity();
    }, [activeSection]);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        toast.success("Código da mira copiado!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleAddCrosshair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newCode) return toast.error("Preencha nome e código!");
        
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/crosshairs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    code: newCode,
                    description: newDesc,
                    previewColor: prevColor,
                    previewSize: prevSize,
                    previewGap: prevGap,
                    previewThick: prevThick,
                    previewDot: prevDot,
                })
            });
            
            if (res.ok) {
                toast.success("Mira postada com sucesso!");
                setNewName('');
                setNewCode('');
                setNewDesc('');
                setPrevColor('#00ff00');
                setPrevSize(5);
                setPrevGap(0);
                setPrevThick(1);
                setPrevDot(false);
                setShowAddForm(false);
                fetchCommunity();
            } else {
                toast.error("Erro ao postar mira.");
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPros = PRO_CROSSHAIRS.filter(p => 
        p.player.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.team.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCommunity = communityCrosshairs.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Tabs */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md">
                <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-purple-500/10 rounded-3xl flex items-center justify-center shadow-inner">
                            <Target className="text-purple-500 w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Database de Miras</h2>
                            <div className="flex gap-4 mt-2">
                                <button 
                                    onClick={() => setActiveSection('pros')}
                                    className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                        activeSection === 'pros' ? 'text-purple-400' : 'text-zinc-600 hover:text-zinc-400'
                                    }`}
                                >
                                    <Star size={12} fill={activeSection === 'pros' ? 'currentColor' : 'none'} /> Jogadores Profissionais
                                </button>
                                <button 
                                    onClick={() => setActiveSection('community')}
                                    className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                        activeSection === 'community' ? 'text-purple-400' : 'text-zinc-600 hover:text-zinc-400'
                                    }`}
                                >
                                    <Globe size={12} /> Miras da Tropa
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder={activeSection === 'pros' ? "Buscar pro..." : "Buscar na comunidade..."}
                                className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {session && (
                            <button 
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
                            >
                                {showAddForm ? 'Cancelar' : <><Plus size={14} /> Postar Minha Mira</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* Add Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleAddCrosshair}
                            className="mt-8 pt-8 border-t border-white/5 overflow-hidden"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Fields */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Nome da Mira</label>
                                        <input type="text" placeholder="Ex: Mira do One-Tap" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Código de Importação</label>
                                        <input type="text" placeholder="CSGO-XXXXX-XXXXX..." value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Descrição (Opcional)</label>
                                        <input type="text" placeholder="Ex: Ponto verde esticado" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none" />
                                    </div>

                                    {/* Visual Config */}
                                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-5">
                                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Configure o Preview da sua Mira</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Cor</label>
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {[
                                                        { label: 'Verde', color: '#00ff00' },
                                                        { label: 'Ciano', color: '#00ffff' },
                                                        { label: 'Amarelo', color: '#ffff00' },
                                                        { label: 'Branco', color: '#ffffff' },
                                                        { label: 'Vermelho', color: '#ff4444' },
                                                        { label: 'Azul', color: '#4488ff' },
                                                    ].map(c => (
                                                        <button key={c.color} type="button" onClick={() => setPrevColor(c.color)}
                                                            style={{ backgroundColor: c.color }}
                                                            className={`w-7 h-7 rounded-lg border-2 transition-all ${prevColor === c.color ? 'border-white scale-110' : 'border-transparent'}`}
                                                            title={c.label}
                                                        />
                                                    ))}
                                                    <input type="color" value={prevColor} onChange={(e) => setPrevColor(e.target.value)}
                                                        className="w-7 h-7 rounded-lg cursor-pointer bg-zinc-800 border border-white/10" title="Cor personalizada" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Ponto Central</label>
                                                <button type="button" onClick={() => setPrevDot(!prevDot)}
                                                    className={`mt-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all border ${
                                                        prevDot ? 'bg-purple-500 text-black border-purple-400' : 'bg-zinc-900 text-zinc-400 border-white/5'
                                                    }`}>
                                                    {prevDot ? 'Com Ponto' : 'Sem Ponto'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Tamanho: {prevSize}px</label>
                                                <input type="range" min={1} max={20} value={prevSize} onChange={(e) => setPrevSize(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-zinc-900 rounded appearance-none cursor-pointer accent-purple-500 mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Espessura: {prevThick}px</label>
                                                <input type="range" min={0.5} max={5} step={0.5} value={prevThick} onChange={(e) => setPrevThick(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-zinc-900 rounded appearance-none cursor-pointer accent-purple-500 mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Espaçamento: {prevGap}px</label>
                                                <input type="range" min={-5} max={10} step={0.5} value={prevGap} onChange={(e) => setPrevGap(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-zinc-900 rounded appearance-none cursor-pointer accent-purple-500 mt-1" />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSubmitting}
                                        className="w-full bg-purple-500 hover:bg-purple-400 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : '🎯 Postar Mira na Tropa'}
                                    </button>
                                </div>

                                {/* Right: Live Preview */}
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Preview ao Vivo</label>
                                    <div className="flex-1 bg-black rounded-3xl border border-white/5 flex items-center justify-center min-h-[240px] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://images.squarespace-cdn.com/content/v1/5e396659e19d7d3d3d3d3d3d/1580822617617-6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z/Mirage_A_Site.jpg')] bg-cover bg-center opacity-30" />
                                        <CrosshairPreview style={formPreviewStyle} scale={3} />
                                    </div>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-3 text-center">Ajuste os sliders até ficar igual à sua mira no jogo</p>
                                </div>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {activeSection === 'pros' ? (
                        filteredPros.map((pro) => (
                            <CrosshairCard 
                                key={pro.id} 
                                id={pro.id}
                                title={pro.player} 
                                subtitle={pro.team}
                                code={pro.code}
                                description={pro.description}
                                type={pro.type}
                                previewStyle={pro.previewStyle}
                                isPro={true}
                                handleCopy={handleCopy}
                                copiedId={copiedId}
                            />
                        ))
                    ) : (
                        loadingCommunity ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-96 bg-zinc-900/40 rounded-[2.5rem] animate-pulse border border-white/5" />
                            ))
                        ) : filteredCommunity.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-zinc-900/20 border border-dashed border-white/5 rounded-[2.5rem]">
                                <Users size={48} className="mx-auto text-zinc-800 mb-4" />
                                <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Nenhuma mira da comunidade encontrada.</p>
                            </div>
                        ) : (
                            filteredCommunity.map((comm) => (
                                <CrosshairCard 
                                    key={comm.id} 
                                    id={comm.id}
                                    title={comm.name} 
                                    subtitle={comm.user.name}
                                    userImage={comm.user.image}
                                    code={comm.code}
                                    description={comm.description || 'Mira postada por membro da Tropa.'}
                                    isPro={false}
                                    handleCopy={handleCopy}
                                    copiedId={copiedId}
                                    previewStyle={{
                                        width: `${Math.max(1, (comm.previewSize ?? 5))}px`,
                                        height: `${Math.max(1, (comm.previewSize ?? 5))}px`,
                                        gap: `${comm.previewGap ?? 0}px`,
                                        thickness: `${Math.max(0.5, (comm.previewThick ?? 1))}px`,
                                        dot: comm.previewDot ?? false,
                                        outline: false,
                                        color: comm.previewColor ?? '#00ff00',
                                    }}
                                />
                            ))
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// CrosshairPreview — componente reutilizável que renderiza a mira
const CrosshairPreview = ({ style, scale = 1 }: { style: any; scale?: number }) => (
    <div style={{ transform: `scale(${scale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 40, height: 40 }}>
        {/* Direita */}
        <div style={{ position: 'absolute', width: style.width, height: style.thickness, backgroundColor: style.color, left: `calc(50% + ${style.gap} + 1px)`, top: '50%', transform: 'translateY(-50%)', boxShadow: style.outline ? '0 0 0 1px black' : 'none' }} />
        {/* Esquerda */}
        <div style={{ position: 'absolute', width: style.width, height: style.thickness, backgroundColor: style.color, right: `calc(50% + ${style.gap} + 1px)`, top: '50%', transform: 'translateY(-50%)', boxShadow: style.outline ? '0 0 0 1px black' : 'none' }} />
        {/* Cima */}
        <div style={{ position: 'absolute', height: style.width, width: style.thickness, backgroundColor: style.color, bottom: `calc(50% + ${style.gap} + 1px)`, left: '50%', transform: 'translateX(-50%)', boxShadow: style.outline ? '0 0 0 1px black' : 'none' }} />
        {/* Baixo */}
        <div style={{ position: 'absolute', height: style.width, width: style.thickness, backgroundColor: style.color, top: `calc(50% + ${style.gap} + 1px)`, left: '50%', transform: 'translateX(-50%)', boxShadow: style.outline ? '0 0 0 1px black' : 'none' }} />
        {style.dot && <div style={{ position: 'absolute', width: style.thickness, height: style.thickness, backgroundColor: style.color, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', boxShadow: style.outline ? '0 0 0 1px black' : 'none' }} />}
    </div>
);

// Subcomponent for the Card to avoid repetition
const CrosshairCard = ({ 
    id, title, subtitle, userImage, code, description, previewStyle, isPro, handleCopy, copiedId 
}: any) => {
    const style = previewStyle;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative bg-zinc-900/60 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-purple-500/40 transition-all shadow-2xl backdrop-blur-sm"
        >
            <div className="relative aspect-[16/9] bg-[url('https://images.squarespace-cdn.com/content/v1/5e396659e19d7d3d3d3d3d3d/1580822617617-6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z/Mirage_A_Site.jpg')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <CrosshairPreview style={style} scale={5} />
                </div>
            </div>

            <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {isPro ? (
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-black text-purple-400">
                                {title[0].toUpperCase()}
                            </div>
                        ) : (
                            <img src={userImage || '/img/default-avatar.png'} className="w-10 h-10 rounded-xl border border-white/10" />
                        )}
                        <div>
                            <h4 className="text-xl font-black italic uppercase tracking-tighter text-white truncate max-w-[150px]">{title}</h4>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{subtitle}</p>
                        </div>
                    </div>
                    {isPro ? (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-black" title="Jogador Profissional">
                            <Star size={12} fill="currentColor" />
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500" title="Membro da Tropa">
                            <User size={12} />
                        </div>
                    )}
                </div>

                <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-6 h-8 line-clamp-2">
                    {description}
                </p>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleCopy(code, id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                            copiedId === id 
                                ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' 
                                : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                        }`}
                    >
                        {copiedId === id ? <Check size={16} /> : <Copy size={16} />}
                        {copiedId === id ? 'Copiado' : 'Copiar Código'}
                    </button>
                    <button className="w-12 h-12 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-2xl text-zinc-600 hover:text-white transition-all">
                        <Info size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CrosshairHub;
