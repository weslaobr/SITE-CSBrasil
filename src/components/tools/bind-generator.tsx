"use client";
import React, { useState } from 'react';
import { Zap, Copy, Check, Terminal, Keyboard, MousePointer2, Volume2, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface BindTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    commands: string;
    needsKey: boolean;
    defaultKey?: string;
}

const BIND_TEMPLATES: BindTemplate[] = [
    {
        id: 'jumpthrow',
        name: 'Jumpthrow (CS2)',
        description: 'Arremesso perfeito de granadas durante o pulo.',
        icon: <Zap className="w-5 h-5 text-yellow-500" />,
        commands: 'alias "+jumpaction" "+jump"; alias "-jumpaction" "-jump"; alias "+throwaction" "-attack; -attack2"; bind "{KEY}" "+jumpaction; +throwaction"',
        needsKey: true,
        defaultKey: 'alt'
    },
    {
        id: 'radar',
        name: 'Zoom do Radar',
        description: 'Alterna o zoom do radar para ver melhor o mapa.',
        icon: <Search className="w-5 h-5 text-blue-500" />,
        commands: 'bind "{KEY}" "toggle cl_radar_scale 0.35 0.7"',
        needsKey: true,
        defaultKey: 'q'
    },
    {
        id: 'clutch',
        name: 'Modo Clutch',
        description: 'Aumenta volume e muta o chat de voz.',
        icon: <Volume2 className="w-5 h-5 text-purple-500" />,
        commands: 'alias "clutch" "clutch_on"; alias "clutch_on" "voice_enable 0; volume 0.8; play items/nvg_on; alias clutch clutch_off"; alias "clutch_off" "voice_enable 1; volume 0.4; play items/nvg_off; alias clutch clutch_on"; bind "{KEY}" "clutch"',
        needsKey: true,
        defaultKey: 'c'
    },
    {
        id: 'dropc4',
        name: 'Drop C4 Instantâneo',
        description: 'Dropa a C4 sem precisar equipar manualmente.',
        icon: <Terminal className="w-5 h-5 text-orange-500" />,
        commands: 'bind "{KEY}" "use weapon_c4; drop"',
        needsKey: true,
        defaultKey: 'n'
    }
];

const BindGenerator: React.FC = () => {
    const [selectedTemplate, setSelectedTemplate] = useState<BindTemplate | null>(null);
    const [selectedKey, setSelectedKey] = useState('alt');
    const [copied, setCopied] = useState(false);

    const generatedCommand = selectedTemplate 
        ? selectedTemplate.commands.replace(/{KEY}/g, selectedKey.toLowerCase())
        : '';

    const handleCopy = () => {
        if (!generatedCommand) return;
        navigator.clipboard.writeText(generatedCommand);
        setCopied(true);
        toast.success("Comando copiado para o console!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Template Selection */}
            <div className="lg:col-span-5 space-y-4">
                <h3 className="text-sm font-black uppercase text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                    <Keyboard size={14} className="text-orange-500" /> Escolha o Atalho
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {BIND_TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => {
                                setSelectedTemplate(tpl);
                                if (tpl.defaultKey) setSelectedKey(tpl.defaultKey);
                            }}
                            className={`flex items-start gap-4 p-5 rounded-[1.5rem] border transition-all text-left group ${
                                selectedTemplate?.id === tpl.id
                                    ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/5'
                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                            }`}
                        >
                            <div className={`p-3 rounded-xl transition-colors ${
                                selectedTemplate?.id === tpl.id ? 'bg-orange-500 text-black' : 'bg-zinc-950 text-zinc-500 group-hover:text-zinc-300'
                            }`}>
                                {tpl.icon}
                            </div>
                            <div>
                                <h4 className={`font-black uppercase tracking-tighter text-lg ${
                                    selectedTemplate?.id === tpl.id ? 'text-white' : 'text-zinc-400'
                                }`}>
                                    {tpl.name}
                                </h4>
                                <p className="text-xs text-zinc-600 font-medium leading-relaxed mt-1">{tpl.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Configuration & Result */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-zinc-900/60 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl h-full flex flex-col">
                    {!selectedTemplate ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                            <Terminal size={64} className="text-zinc-800 mb-6" />
                            <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Selecione um modelo à esquerda</p>
                        </div>
                    ) : (
                        <div className="flex-1 space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black uppercase tracking-tighter text-white">Configurar Tecla</h3>
                                <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase text-orange-500 tracking-widest">
                                    Personalizar
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-3 tracking-[0.2em]">Pressione a Tecla Desejada</label>
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        value={selectedKey}
                                        onChange={(e) => setSelectedKey(e.target.value)}
                                        placeholder="ex: mouse4, alt, q..."
                                        className="flex-1 bg-zinc-950 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white focus:border-orange-500 outline-none shadow-inner uppercase text-center"
                                    />
                                    <button 
                                        onClick={() => setSelectedKey(selectedTemplate.defaultKey || 'alt')}
                                        className="p-4 bg-zinc-950 border border-white/5 rounded-2xl text-zinc-500 hover:text-white hover:border-white/20 transition-all"
                                        title="Resetar Tecla"
                                    >
                                        <RotateCcw size={20} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-3 flex items-center gap-2">
                                    <MousePointer2 size={12} /> Dica: Você pode digitar nomes como "MOUSE4", "MWHEELUP", "ALT", etc.
                                </p>
                            </div>

                            <div className="space-y-4 pt-4 flex-1 flex flex-col">
                                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Comando Pronto para o Console</label>
                                <div className="relative group flex-1">
                                    <textarea
                                        readOnly
                                        value={generatedCommand}
                                        className="w-full h-full min-h-[120px] bg-black border border-white/5 rounded-2xl p-6 font-mono text-sm text-orange-400/90 leading-relaxed outline-none resize-none shadow-inner group-hover:border-orange-500/20 transition-all"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className={`absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                            copied 
                                                ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                                                : 'bg-orange-500 text-black hover:bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105'
                                        }`}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copiado!' : 'Copiar Bind'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                    <Zap size={14} className="text-orange-500" />
                                    <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase tracking-widest">
                                        Copie o comando acima e cole diretamente no console (tecla ') dentro do jogo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BindGenerator;
