"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, 
    Cpu, 
    HardDrive, 
    Play, 
    Square, 
    RefreshCw, 
    Terminal, 
    Users, 
    Globe, 
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    Send
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';

interface ServerResources {
    current_state: string;
    resources: {
        memory_bytes: number;
        cpu_absolute: number;
        disk_bytes: number;
        network_rx_bytes: number;
        network_tx_bytes: number;
        uptime: number;
    };
}

const ADMIN_STEAM_ID = "76561198024691636";

export function ServerDashboard() {
    const [resources, setResources] = useState<ServerResources | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [powerLoading, setPowerLoading] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [command, setCommand] = useState('');
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const consoleRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchResources = async () => {
        try {
            const res = await fetch('/api/server/resources');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Falha ao conectar com o servidor');
            }
            const data = await res.json();
            setResources(data.attributes);
            setError(null);
            
            // Add to history for chart
            setHistory(prev => {
                const newEntry = {
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    cpu: data.attributes.resources.cpu_absolute.toFixed(1),
                    memory: (data.attributes.resources.memory_bytes / 1024 / 1024 / 1024).toFixed(2),
                };
                const updated = [...prev, newEntry];
                return updated.slice(-20); // Keep last 20 entries
            });
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Fetch initial resources and start polling
    useEffect(() => {
        fetchResources();
        const interval = setInterval(fetchResources, 3000);
        return () => clearInterval(interval);
    }, []);

    // Setup Websocket for Console
    useEffect(() => {
        const setupWebsocket = async () => {
            try {
                const res = await fetch('/api/server/console');
                if (!res.ok) return;
                const { data } = await res.json();
                
                const socket = new WebSocket(data.socket);
                socketRef.current = socket;

                socket.onopen = () => {
                    socket.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                };

                socket.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'console output') {
                        setLogs(prev => [...prev.slice(-100), msg.args[0]]);
                    }
                };

                socket.onclose = () => {
                    console.log('Websocket closed, retrying in 5s...');
                    setTimeout(setupWebsocket, 5000);
                };
            } catch (err) {
                console.error('WS Error:', err);
            }
        };

        setupWebsocket();
        return () => socketRef.current?.close();
    }, []);

    // Auto-scroll console
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const handlePower = async (signal: string) => {
        setPowerLoading(signal);
        try {
            const res = await fetch('/api/server/power', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Falha ao enviar comando');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão ao enviar comando');
        } finally {
            setPowerLoading(null);
        }
    };

    const sendCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!command || !socketRef.current) return;
        socketRef.current.send(JSON.stringify({ event: 'send command', args: [command] }));
        setCommand('');
    };

    if (!mounted) return null;

    if (error && !resources) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">Erro de Conexão</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto">{error}</p>
                </div>
                <button 
                    onClick={() => { setLoading(true); fetchResources(); }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Dashboard...</p>
            </div>
        );
    }

    const formatBytes = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    const statusColors: any = {
        running: "text-green-500",
        starting: "text-yellow-500",
        stopping: "text-orange-500",
        offline: "text-red-500"
    };

    const statusLabels: any = {
        running: "Online",
        starting: "Iniciando",
        stopping: "Desligando",
        offline: "Offline"
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header / Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-white/5 ${statusColors[resources?.current_state || 'offline']}`}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Status</p>
                        <p className={`font-black uppercase text-sm ${statusColors[resources?.current_state || 'offline']}`}>
                            {statusLabels[resources?.current_state || 'offline']}
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 text-yellow-500">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">CPU</p>
                        <p className="font-black text-white text-sm">{resources?.resources.cpu_absolute.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 text-blue-500">
                        <HardDrive size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Memória</p>
                        <p className="font-black text-white text-sm">{formatBytes(resources?.resources.memory_bytes || 0)}</p>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 text-purple-500">
                        <HardDrive size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Disco</p>
                        <p className="font-black text-white text-sm">{formatBytes(resources?.resources.disk_bytes || 0)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Charts & Controls */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Controls */}
                    <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Controles do Servidor</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={() => handlePower('start')}
                                disabled={!!powerLoading || resources?.current_state === 'running'}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-all disabled:opacity-50 group"
                            >
                                {powerLoading === 'start' ? <Loader2 size={20} className="animate-spin text-green-500" /> : <Play size={20} className="text-green-500 group-hover:scale-110 transition-transform" />}
                                <span className="text-[10px] font-black uppercase text-green-500/80">Ligar</span>
                            </button>
                            <button 
                                onClick={() => handlePower('restart')}
                                disabled={!!powerLoading}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-2xl transition-all disabled:opacity-50 group"
                            >
                                {powerLoading === 'restart' ? <Loader2 size={20} className="animate-spin text-yellow-500" /> : <RefreshCw size={20} className="text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />}
                                <span className="text-[10px] font-black uppercase text-yellow-500/80">Reset</span>
                            </button>
                            <button 
                                onClick={() => handlePower('stop')}
                                disabled={!!powerLoading || resources?.current_state === 'offline'}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all disabled:opacity-50 group"
                            >
                                {powerLoading === 'stop' ? <Loader2 size={20} className="animate-spin text-red-500" /> : <Square size={20} className="text-red-500 group-hover:scale-110 transition-transform" />}
                                <span className="text-[10px] font-black uppercase text-red-500/80">Parar</span>
                            </button>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl h-[300px]">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Uso de CPU (%)</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                                    itemStyle={{ color: '#eab308', fontWeight: 'bold' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="cpu" 
                                    stroke="#eab308" 
                                    fillOpacity={1} 
                                    fill="url(#colorCpu)" 
                                    strokeWidth={3}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Center/Right Column: Console */}
                <div className="lg:col-span-2 flex flex-col h-[600px] bg-black/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                    {/* Console Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                        <div className="flex items-center gap-3">
                            <Terminal size={18} className="text-zinc-500" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Console de Logs</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${socketRef.current?.readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Websocket Live</span>
                        </div>
                    </div>

                    {/* Console Output */}
                    <div 
                        ref={consoleRef}
                        className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed text-zinc-400 scroll-smooth"
                    >
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 border-l-2 border-transparent hover:border-yellow-500/20 hover:bg-white/5 px-2 transition-all">
                                <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                {log}
                            </div>
                        ))}
                    </div>

                    {/* Console Input */}
                    <form onSubmit={sendCommand} className="p-4 bg-zinc-900/40 border-t border-white/5 relative group">
                        <input 
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="Digite um comando rcon ou mensagem..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                        />
                        <button 
                            type="submit"
                            className="absolute right-7 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-yellow-500 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
