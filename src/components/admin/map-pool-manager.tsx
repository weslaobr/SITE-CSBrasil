"use client";

import React, { useState, useEffect } from 'react';
import { 
    Map as MapIcon, Save, Plus, Trash2, Check, X, 
    RefreshCw, Loader2, Image as ImageIcon, Eye, EyeOff
} from 'lucide-react';

interface MapConfig {
    id: string;
    name: string;
    image: string;
    active: boolean;
}

export default function MapPoolManager() {
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // New map form state
    const [newMap, setNewMap] = useState({ id: '', name: '', image: '', active: true });

    useEffect(() => {
        fetchMaps();
    }, []);

    const fetchMaps = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/maps');
            if (!res.ok) throw new Error('Erro ao buscar mapas');
            const data = await res.json();
            setMaps(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedMaps = maps) => {
        setSaving(true);
        setSuccess(false);
        try {
            const res = await fetch('/api/admin/maps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedMaps),
            });
            if (!res.ok) throw new Error('Erro ao salvar');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleMap = (id: string) => {
        const updated = maps.map(m => m.id === id ? { ...m, active: !m.active } : m);
        setMaps(updated);
    };

    const removeMap = (id: string) => {
        if (!confirm('Tem certeza que deseja remover este mapa?')) return;
        const updated = maps.filter(m => m.id !== id);
        setMaps(updated);
        handleSave(updated);
    };

    const addMap = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMap.id || !newMap.name) return;
        
        const updated = [...maps, { ...newMap }];
        setMaps(updated);
        setNewMap({ id: '', name: '', image: '', active: true });
        handleSave(updated);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Pool de Mapas...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Gerenciamento de Mapas</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configure quais mapas aparecem no veto e sorteador</p>
                </div>
                <button 
                    onClick={() => handleSave()}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 ${success ? 'bg-green-500 text-black' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : (success ? <Check size={14} /> : <Save size={14} />)}
                    {success ? 'Salvo!' : 'Salvar Alterações'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-wide">
                    <X size={16} /> {error}
                </div>
            )}

            {/* Map Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {maps.map(map => (
                    <div key={map.id} className={`relative group overflow-hidden rounded-2xl border transition-all ${map.active ? 'bg-zinc-900/40 border-white/10' : 'bg-black/40 border-white/5 opacity-50 grayscale'}`}>
                        {/* Map Preview */}
                        <div className="aspect-[16/9] relative overflow-hidden">
                            <img 
                                src={map.image || '/img/maps/placeholder.webp'} 
                                alt={map.name} 
                                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            
                            {/* Toggle Status Overlay */}
                            <button 
                                onClick={() => toggleMap(map.id)}
                                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white hover:text-yellow-500 transition-colors"
                            >
                                {map.active ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                        </div>

                        {/* Map Info */}
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <p className="font-black text-xs uppercase text-white tracking-widest">{map.name}</p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-0.5">{map.id}</p>
                            </div>
                            <button 
                                onClick={() => removeMap(map.id)}
                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Map Card */}
                <div className="bg-zinc-900/20 border-2 border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-yellow-500/20 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-yellow-500 group-hover:bg-yellow-500/10 transition-all">
                        <Plus size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest group-hover:text-zinc-400">Novo Mapa</p>

                    <form onSubmit={addMap} className="w-full space-y-3 mt-2 hidden group-hover:block">
                        <input 
                            type="text" 
                            placeholder="Nome (Ex: Cache)"
                            value={newMap.name}
                            onChange={e => setNewMap({...newMap, name: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40 font-bold"
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="ID (Ex: cache)"
                            value={newMap.id}
                            onChange={e => setNewMap({...newMap, id: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40 font-mono"
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="URL da Imagem"
                            value={newMap.image}
                            onChange={e => setNewMap({...newMap, image: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/40"
                        />
                        <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                            Adicionar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
