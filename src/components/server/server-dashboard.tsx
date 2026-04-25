"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Cpu, HardDrive, Play, Square, RefreshCw, Terminal,
    Network, WifiOff, Loader2, Send, Copy, Check, AlertTriangle,
    Clock, Server, Users, Map as MapIcon, Settings, MessageSquare,
    Zap, Pause, PlayCircle, SkipForward, UserMinus, Bot, RotateCcw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Resources {
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

interface Player {
    id: string; // The numeric ID from the status command
    name: string;
    steamId: string;
    ping: string;
    connectedTime: string;
}

interface MapConfig {
    id: string;
    name: string;
    image: string;
    active: boolean;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmtBytes = (b: number, unit: 'MB' | 'GB' = 'GB') => {
    if (unit === 'MB') return `${(b / 1024 / 1024).toFixed(0)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const fmtUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
};

const colorLog = (line: string) => {
    if (/error|exception|fatal|failed/i.test(line)) return 'text-red-400';
    if (/warn|warning/i.test(line)) return 'text-yellow-400';
    if (/success|started|ready|running/i.test(line)) return 'text-green-400';
    if (/\[matchzy\]|\[match\]/i.test(line)) return 'text-blue-300';
    return 'text-zinc-400';
};

const STATUS_MAP: any = {
    running: { label: 'Online',    color: 'text-green-400',  dot: 'bg-green-400',  border: 'border-green-500/20', bg: 'bg-green-500/10' },
    starting: { label: 'Iniciando', color: 'text-yellow-400', dot: 'bg-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/10' },
    stopping: { label: 'Parando',   color: 'text-orange-400', dot: 'bg-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
    offline:  { label: 'Offline',   color: 'text-red-400',    dot: 'bg-red-400',    border: 'border-red-500/20',    bg: 'bg-red-500/10'    },
};

const GAME_MODES = [
    { label: 'Competitivo', icon: '🏆', cmd: 'exec comp.cfg; map de_mirage',  desc: 'Config: comp.cfg', color: 'yellow' },
    { label: 'Arena',       icon: '🎯', cmd: 'exec arena.cfg; host_workshop_map 3232758809', desc: 'Config: arena.cfg', color: 'red' },
    { label: '1v1',         icon: '⚔️',  cmd: 'exec 1v1.cfg; host_workshop_map 3070549948',   desc: 'Config: 1v1.cfg', color: 'orange' },
    { label: 'Retake',      icon: '♻️',  cmd: 'exec retake.cfg; map de_mirage',desc: 'Config: retake.cfg', color: 'cyan' },
    { label: 'DeathMatch',  icon: '💀', cmd: 'exec dm.cfg; map de_mirage',    desc: 'Config: dm.cfg', color: 'blue' },
];

const MODE_COLOR: Record<string, string> = {
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
    red:    'bg-red-500/10    border-red-500/20    text-red-400    hover:bg-red-500/20',
    green:  'bg-green-500/10  border-green-500/20  text-green-400  hover:bg-green-500/20',
    blue:   'bg-blue-500/10   border-blue-500/20   text-blue-400   hover:bg-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    pink:   'bg-pink-500/10   border-pink-500/20   text-pink-400   hover:bg-pink-500/20',
    cyan:   'bg-cyan-500/10   border-cyan-500/20   text-cyan-400   hover:bg-cyan-500/20',
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const StatCard = ({ icon, label, value, color = 'text-yellow-500', sub }: any) => (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-900/80 transition-all">
        <div className={`p-3 rounded-xl bg-white/5 ${color} flex-shrink-0`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{label}</p>
            <p className={`font-black text-sm text-white truncate`}>{value}</p>
            {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const GradientChart = ({ data, dataKey, color, unit }: any) => (
    <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
            <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 'auto']} hide />
            <Tooltip
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color, fontWeight: 'bold' }}
                formatter={(v: any) => [`${v}${unit}`, dataKey.toUpperCase()]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} isAnimationActive={false} dot={false} />
        </AreaChart>
    </ResponsiveContainer>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export function ServerDashboard() {
    const SERVER_IP = '103.14.27.41:27272';
    const SERVER_PASS = '091867';

    const [resources, setResources] = useState<Resources | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [powerLoading, setPowerLoading] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [command, setCommand] = useState('');
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [copiedIp, setCopiedIp] = useState(false);

    // New management state
    const [players, setPlayers] = useState<Player[]>([]);
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [isRefreshingPlayers, setIsRefreshingPlayers] = useState(false);
    const [sayMessage, setSayMessage] = useState('');
    const [activeMgmtTab, setActiveMgmtTab] = useState<'players' | 'server' | 'settings'>('players');
    const [activeMode, setActiveMode] = useState<string | null>(null);
    const [serverControlTab, setServerControlTab] = useState<'modes' | 'maps' | 'controls' | 'config'>('modes');

    const consoleRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const retryRef = useRef<NodeJS.Timeout | null>(null);
    const statusBufferRef = useRef<string[]>([]);
    const parsingStatusRef = useRef(false);

    useEffect(() => { 
        setMounted(true);
        fetchMaps();
    }, []);

    const fetchMaps = async () => {
        try {
            const res = await fetch('/api/admin/maps');
            if (res.ok) setMaps(await res.json());
        } catch (e) {
            console.error('Erro ao buscar mapas:', e);
        }
    };

    // ── Polling ──────────────────────────────────
    const fetchResources = useCallback(async () => {
        try {
            const res = await fetch('/api/server/resources');
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || `Erro ${res.status}`);
            }
            const data = await res.json();
            setResources(data.attributes);
            setError(null);
            setLoading(false);
            const r = data.attributes.resources;
            setHistory(prev => [...prev.slice(-25), {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                cpu:  parseFloat(r.cpu_absolute.toFixed(2)),
                ram:  parseFloat((r.memory_bytes / 1024 / 1024).toFixed(0)),
                netIn: parseFloat((r.network_rx_bytes / 1024).toFixed(1)),
                netOut: parseFloat((r.network_tx_bytes / 1024).toFixed(1)),
            }]);
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResources();
        const iv = setInterval(fetchResources, 4000);
        return () => clearInterval(iv);
    }, [fetchResources]);

    // ── WebSocket ─────────────────────────────────
    const connectWs = useCallback(async () => {
        if (socketRef.current?.readyState === WebSocket.CONNECTING) return;
        
        setWsStatus('connecting');
        if (retryRef.current) clearTimeout(retryRef.current);

        try {
            const res = await fetch('/api/server/console');
            if (!res.ok) { 
                setWsStatus('disconnected');
                retryRef.current = setTimeout(connectWs, 10000);
                return; 
            }
            
            const json = await res.json();
            const { data } = json;
            
            if (!data?.socket || !data?.token) {
                setWsStatus('disconnected');
                retryRef.current = setTimeout(connectWs, 10000);
                return;
            }

            const ws = new WebSocket(data.socket);
            socketRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                // Pterodactyl needs sometimes a second to process auth
                setWsStatus('connected');
                setLogs(prev => [...prev.slice(-150), ">>> Conexão estabelecida. Autenticando..."]);
            };

            ws.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    
                    if (msg.event === 'auth success') {
                        setLogs(prev => [...prev.slice(-150), ">>> Autenticado com sucesso!"]);
                        return;
                    }

                    if (msg.event === 'token expiring' || msg.event === 'token expired') {
                        setLogs(prev => [...prev.slice(-150), ">>> Token expirado. Reconectando..."]);
                        ws.close();
                        return;
                    }

                    if (msg.event === 'console output' && msg.args?.[0]) {
                        const line = msg.args[0];
                        setLogs(prev => [...prev.slice(-150), line]);

                        if (line.includes('#      userid name') || parsingStatusRef.current) {
                            parsingStatusRef.current = true;
                            statusBufferRef.current.push(line);
                            if (statusBufferRef.current.length > 2 && !line.startsWith('#') && line.trim() !== '') {
                                finalizeStatusParse();
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            ws.onclose = (event) => {
                setWsStatus('disconnected');
                socketRef.current = null;
                
                // 1006 is often a network/firewall block for WSS on non-standard ports
                if (event.code === 1006) {
                    setLogs(prev => [...prev.slice(-150), ">>> Logs em tempo real indisponíveis (Bloqueio de Rede/Porta)."]);
                    // Retry much slower for 1006
                    if (retryRef.current) clearTimeout(retryRef.current);
                    retryRef.current = setTimeout(connectWs, 30000);
                    return;
                }

                if (event.code !== 1000) {
                    let reason = "Conexão perdida";
                    if (event.code === 4000) reason = "Token de autenticação inválido";
                    
                    setLogs(prev => [...prev.slice(-150), `>>> ${reason}. Código: ${event.code}. Tentando em 10s...`]);
                    if (retryRef.current) clearTimeout(retryRef.current);
                    retryRef.current = setTimeout(connectWs, 10000);
                }
            };

            ws.onerror = () => {
                setWsStatus('disconnected');
                ws.close();
            };
        } catch (err) { 
            setWsStatus('disconnected'); 
            retryRef.current = setTimeout(connectWs, 10000);
        }
    }, []);

    useEffect(() => {
        connectWs();
        return () => {
            socketRef.current?.close();
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [connectWs]);

    useEffect(() => {
        if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }, [logs]);

    const finalizeStatusParse = () => {
        const fullStatus = statusBufferRef.current.join('\n');
        const playerLines = statusBufferRef.current.filter(l => l.startsWith('#') && !l.includes('userid name'));
        
        const parsedPlayers: Player[] = playerLines.map(line => {
            // Regex for: # 1 2 "Name" STEAM_1:0:1234 01:23 15 0 active
            const match = line.match(/#\s+\d+\s+(\d+)\s+"(.+)"\s+(STEAM_\d:\d:\d+|BOT)\s+([\d:]+|\w+)\s+(\d+|-)\s+/);
            if (match) {
                return {
                    id: match[1],
                    name: match[2],
                    steamId: match[3],
                    connectedTime: match[4],
                    ping: match[5]
                };
            }
            return null;
        }).filter(Boolean) as Player[];

        setPlayers(parsedPlayers);
        statusBufferRef.current = [];
        parsingStatusRef.current = false;
        setIsRefreshingPlayers(false);
    };

    const refreshPlayers = () => {
        if (!socketRef.current || socketRef.current.readyState !== 1) return;
        setIsRefreshingPlayers(true);
        statusBufferRef.current = [];
        socketRef.current.send(JSON.stringify({ event: 'send command', args: ['status'] }));
        // Timeout to stop loading if no response
        setTimeout(() => setIsRefreshingPlayers(false), 5000);
    };

    // Auto refresh players every 15s
    useEffect(() => {
        if (wsStatus === 'connected' && activeMgmtTab === 'players') {
            refreshPlayers();
            const iv = setInterval(refreshPlayers, 15000);
            return () => clearInterval(iv);
        }
    }, [wsStatus, activeMgmtTab]);

    // ── Power ─────────────────────────────────────
    const handlePower = async (signal: string) => {
        setPowerLoading(signal);
        try {
            const res = await fetch('/api/server/power', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                alert(d.error || 'Falha ao enviar comando');
            }
        } catch { alert('Erro de conexão'); }
        finally { setPowerLoading(null); }
    };

    const sendCommandRaw = async (cmd: string) => {
        // Log locally immediately
        setLogs(prev => [...prev.slice(-150), `> ${cmd}`]);
        
        try {
            const res = await fetch('/api/server/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setLogs(prev => [...prev.slice(-150), `[ERRO] Falha ao enviar comando: ${data.error || res.statusText}`]);
            }
        } catch (e) {
            setLogs(prev => [...prev.slice(-150), `[ERRO] Falha na conexão ao enviar comando.`]);
        }
    };

    const sendCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;
        const currentCmd = command;
        setCommand('');
        await sendCommandRaw(currentCmd);
    };

    const copyIp = () => {
        navigator.clipboard.writeText(`connect ${SERVER_IP}; password ${SERVER_PASS}`);
        setCopiedIp(true);
        setTimeout(() => setCopiedIp(false), 2000);
    };

    // ── Render guards ─────────────────────────────
    if (!mounted) return null;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Conectando ao servidor...</p>
        </div>
    );

    if (error && !resources) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">Erro de Conexão</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">{error}</p>
            </div>
            <button onClick={() => { setLoading(true); fetchResources(); }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Tentar Novamente
            </button>
        </div>
    );

    const state = resources?.current_state || 'offline';
    const s = STATUS_MAP[state] || STATUS_MAP.offline;
    const r = resources?.resources;

    return (
        <div className="space-y-5 p-6 pb-12">

            {/* ── TOP STATUS BAR ──────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Status */}
                <div className={`col-span-2 md:col-span-1 flex items-center gap-3 px-4 py-3 rounded-2xl border ${s.border} ${s.bg}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot} animate-pulse flex-shrink-0`} />
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Status</p>
                        <p className={`font-black text-sm uppercase ${s.color}`}>{s.label}</p>
                    </div>
                </div>

                <StatCard icon={<Cpu size={20} />}       label="CPU"      value={`${r?.cpu_absolute.toFixed(1)}%`}   color="text-yellow-500" />
                <StatCard icon={<HardDrive size={20} />} label="Memória"  value={fmtBytes(r?.memory_bytes || 0)}    color="text-blue-400" sub={`de 3.91 GB`} />
                <StatCard icon={<HardDrive size={20} />} label="Disco"    value={fmtBytes(r?.disk_bytes || 0)}      color="text-purple-400" sub={`de 68.36 GB`} />
                <StatCard icon={<Network size={20} />}   label="Rede ↓"   value={fmtBytes(r?.network_rx_bytes || 0, 'MB')} color="text-green-400" />
                <StatCard icon={<Clock size={20} />}     label="Uptime"   value={fmtUptime(r?.uptime || 0)}          color="text-orange-400" />
            </div>

            {/* ── MAIN GRID ───────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* LEFT: Controls + Charts + Connection ──── */}
                <div className="xl:col-span-1 space-y-5">

                    {/* Power Controls */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Controles do Servidor</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { sig: 'start',   label: 'Ligar',    icon: <Play size={18} />,       cls: 'green',  disabled: state === 'running' },
                                { sig: 'restart', label: 'Restart',  icon: <RefreshCw size={18} />,  cls: 'yellow', disabled: false },
                                { sig: 'stop',    label: 'Parar',    icon: <Square size={18} />,     cls: 'red',    disabled: state === 'offline' },
                            ].map(({ sig, label, icon, cls, disabled }) => (
                                <button
                                    key={sig}
                                    onClick={() => handlePower(sig)}
                                    disabled={!!powerLoading || disabled}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all disabled:opacity-40 group
                                        ${cls === 'green'  ? 'bg-green-500/10  hover:bg-green-500/20  border-green-500/20  text-green-400'  : ''}
                                        ${cls === 'yellow' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-400' : ''}
                                        ${cls === 'red'    ? 'bg-red-500/10    hover:bg-red-500/20    border-red-500/20    text-red-400'    : ''}
                                    `}
                                >
                                    {powerLoading === sig
                                        ? <Loader2 size={18} className="animate-spin" />
                                        : <span className={sig === 'restart' ? 'group-hover:rotate-180 transition-transform duration-500' : ''}>{icon}</span>
                                    }
                                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CPU Chart */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">CPU (%)</h3>
                        <div className="h-28">
                            <GradientChart data={history} dataKey="cpu" color="#eab308" unit="%" />
                        </div>
                    </div>

                    {/* RAM Chart */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Memória (MB)</h3>
                        <div className="h-28">
                            <GradientChart data={history} dataKey="ram" color="#60a5fa" unit=" MB" />
                        </div>
                    </div>

                    {/* Network Chart */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Rede (KB/s)</h3>
                        <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }} />
                                    <Line type="monotone" dataKey="netIn"  stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} name="Download" />
                                    <Line type="monotone" dataKey="netOut" stroke="#f472b6" strokeWidth={2} dot={false} isAnimationActive={false} name="Upload" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><span className="w-2 h-2 bg-green-400 rounded-full" />Entrada</span>
                            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><span className="w-2 h-2 bg-pink-400 rounded-full" />Saída</span>
                        </div>
                    </div>

                    {/* Connection Info */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Server size={14} className="text-zinc-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Conexão ao Servidor</h3>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between gap-2">
                            <code className="text-[11px] text-yellow-400 font-mono truncate">connect {SERVER_IP}; password {SERVER_PASS}</code>
                            <button onClick={copyIp} className="flex-shrink-0 p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-500 hover:text-yellow-500">
                                {copiedIp ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <a
                            href={`steam://connect/${SERVER_IP}/${SERVER_PASS}`}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                        >
                            Conectar via Steam
                        </a>
                    </div>
                </div>

                {/* RIGHT: Console ───────────────────────── */}
                <div className="xl:col-span-2 flex flex-col rounded-3xl overflow-hidden border border-white/5 bg-black/50 backdrop-blur-sm" style={{ minHeight: '700px' }}>

                    {/* Console Header */}
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/40 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <Terminal size={16} className="text-zinc-500" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Console de Logs</h3>
                            <span className="text-[10px] text-zinc-600 font-mono">{logs.length} linhas</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {wsStatus === 'connected' && <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Live</span>}
                            {wsStatus === 'connecting' && <span className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-bold"><Loader2 size={10} className="animate-spin" />Conectando...</span>}
                            {wsStatus === 'disconnected' && <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold"><WifiOff size={12} />Offline</span>}
                            <button onClick={() => setLogs([])} className="text-zinc-600 hover:text-zinc-400 text-[10px] font-bold uppercase px-2 py-1 rounded-lg hover:bg-white/5 transition-all">Limpar</button>
                        </div>
                    </div>

                    {/* Log Output */}
                    <div ref={consoleRef} className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed space-y-0.5 scroll-smooth">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                                <Terminal size={32} className="text-zinc-600" />
                                <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold">Aguardando logs do servidor...</p>
                                {wsStatus === 'disconnected' && <p className="text-red-500 text-[10px]">WebSocket desconectado. Reconectando em breve...</p>}
                            </div>
                        ) : logs.map((line, i) => (
                            <div key={i} className={`${colorLog(line)} px-2 py-0.5 rounded hover:bg-white/5 transition-all border-l-2 border-transparent hover:border-yellow-500/20`}>
                                <span className="text-zinc-700 mr-2 select-none">{String(i + 1).padStart(3, '0')}</span>
                                {line}
                            </div>
                        ))}
                    </div>

                    {/* Command Input */}
                    <form onSubmit={sendCommand} className="p-4 border-t border-white/5 bg-zinc-900/40 flex-shrink-0">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs select-none">{'>'}</span>
                            <input
                                type="text"
                                value={command}
                                onChange={e => setCommand(e.target.value)}
                                placeholder="Digite um comando rcon (ex: say Bem-vindo!)..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-12 py-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                                disabled={wsStatus !== 'connected'}
                            />
                            <button type="submit" disabled={wsStatus !== 'connected'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-yellow-500 transition-colors disabled:opacity-30">
                                <Send size={14} />
                            </button>
                        </div>
                        {wsStatus !== 'connected' && <p className="text-[10px] text-red-400/60 mt-1.5 px-1">WebSocket desconectado — comandos indisponíveis</p>}
                    </form>
                </div>
            </div>

            {/* ── MANAGEMENT SECTION ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Players Management */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                        <div className="flex items-center gap-3">
                            <Users size={16} className="text-yellow-500" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Controle de Jogadores</h3>
                        </div>
                        <button 
                            onClick={refreshPlayers}
                            disabled={isRefreshingPlayers || wsStatus !== 'connected'}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all disabled:opacity-30"
                        >
                            <RefreshCw size={14} className={`${isRefreshingPlayers ? 'animate-spin' : ''} text-zinc-400`} />
                        </button>
                    </div>

                    <div className="p-0 flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Ping</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {players.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
                                            {isRefreshingPlayers ? 'Buscando jogadores...' : 'Nenhum jogador no servidor'}
                                        </td>
                                    </tr>
                                ) : players.map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-[10px] font-mono text-zinc-500">#{p.id}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-white">{p.name}</p>
                                            <p className="text-[9px] font-mono text-zinc-600 truncate max-w-[120px]">{p.steamId}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-3 rounded-full ${parseInt(p.ping) < 50 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <span className="text-xs font-mono text-zinc-400">{p.ping}ms</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    if(confirm(`Expulsar ${p.name}?`)) sendCommandRaw(`kickid ${p.id}`);
                                                }}
                                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Kick Player"
                                            >
                                                <UserMinus size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Quick Say */}
                    <div className="p-4 border-t border-white/5 bg-zinc-900/10">
                        <form onSubmit={(e) => { e.preventDefault(); if(sayMessage) { sendCommandRaw(`say ${sayMessage}`); setSayMessage(''); } }} className="flex gap-2">
                            <input 
                                type="text"
                                value={sayMessage}
                                onChange={e => setSayMessage(e.target.value)}
                                placeholder="Falar no chat global..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/50"
                            />
                            <button className="bg-yellow-500 hover:bg-yellow-400 text-black p-2 rounded-xl transition-all">
                                <MessageSquare size={16} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Server Controls */}
                <div className="space-y-5">
                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
                        <div className="flex border-b border-white/5">
                            {(['modes', 'maps', 'controls', 'config'] as const).map(tab => (
                                <button key={tab} onClick={() => setServerControlTab(tab)}
                                    className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                                        serverControlTab === tab
                                            ? 'text-yellow-400 border-b-2 border-yellow-500 bg-yellow-500/5'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}>
                                    {tab === 'modes' ? '🎮 Modos' : tab === 'maps' ? '🗺️ Mapas' : tab === 'controls' ? '⚙️ Comandos' : '📝 Config'}
                                </button>
                            ))}
                        </div>

                        {/* MODES TAB */}
                        {serverControlTab === 'modes' && (
                            <div className="p-5 space-y-3">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-4">Selecione o modo — o servidor reiniciará automaticamente</p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {GAME_MODES.map(mode => (
                                        <button
                                            key={mode.label}
                                            onClick={() => {
                                            if (confirm(`Mudar para modo ${mode.label}?\n\nAs configurações serão carregadas e o mapa será trocado imediatamente.`)) {
                                                sendCommandRaw(mode.cmd);
                                                setActiveMode(mode.label);
                                            }
                                            }}
                                            className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-95 text-left ${
                                                activeMode === mode.label
                                                    ? 'ring-2 ring-yellow-500/50 ' + MODE_COLOR[mode.color]
                                                    : MODE_COLOR[mode.color]
                                            }`}
                                        >
                                            <span className="text-xl shrink-0">{mode.icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-wide leading-tight">{mode.label}</p>
                                                <p className="text-[9px] opacity-60 mt-0.5 leading-tight">{mode.desc}</p>
                                            </div>
                                            {activeMode === mode.label && (
                                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MAPS TAB */}
                        {serverControlTab === 'maps' && (
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <p className="text-[10px] text-white font-black uppercase tracking-widest">Pool de Mapas</p>
                                        <p className="text-[8px] text-zinc-500 uppercase font-bold">Clique no cadeado para ativar/desativar</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const res = await fetch('/api/admin/maps', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(maps)
                                                });
                                                if (res.ok) alert('Configurações de mapas salvas!');
                                                else alert('Erro ao salvar.');
                                            } catch (e) { alert('Erro de rede.'); }
                                        }}
                                        className="px-4 py-2 bg-yellow-500 text-black text-[9px] font-black uppercase rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10"
                                    >
                                        Salvar Alterações
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {maps.map(map => (
                                        <div key={map.id} className={`flex flex-col rounded-2xl border overflow-hidden transition-all ${map.active ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/20 opacity-60'}`}>
                                            <div className="relative aspect-video">
                                                <img src={map.image} alt={map.name} className={`object-cover w-full h-full ${map.active ? 'opacity-60' : 'opacity-20 grayscale'}`} />
                                                
                                                {/* Toggle Lock */}
                                                <button 
                                                    onClick={() => {
                                                        const newMaps = maps.map(m => m.id === map.id ? { ...m, active: !m.active } : m);
                                                        setMaps(newMaps);
                                                    }}
                                                    className={`absolute top-2 right-2 p-2 rounded-xl border backdrop-blur-md z-30 transition-all ${
                                                        map.active ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                                                    }`}
                                                >
                                                    {map.active ? <ShieldCheck size={14} /> : <Lock size={14} />}
                                                </button>

                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                                                
                                                <div className="absolute bottom-2 left-3">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${map.active ? 'text-white' : 'text-zinc-500'}`}>{map.name}</p>
                                                    <p className="text-[8px] text-zinc-500 font-mono">{map.id}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="p-2 bg-black/20">
                                                <button 
                                                    onClick={() => {
                                                        if (confirm(`Trocar para ${map.name} agora?`)) {
                                                            sendCommandRaw(`changelevel ${map.id}`);
                                                        }
                                                    }}
                                                    disabled={!map.active}
                                                    className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                        map.active 
                                                            ? 'bg-white/5 hover:bg-yellow-500 hover:text-black text-white border border-white/5' 
                                                            : 'bg-transparent text-zinc-700 border border-transparent cursor-not-allowed'
                                                    }`}
                                                >
                                                    {map.active ? 'Trocar Mapa' : 'Inativo'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CONTROLS TAB */}
                        {serverControlTab === 'controls' && (
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: '🔄 Reiniciar Round',   cmd: 'mp_restartgame 1',           cls: 'yellow' },
                                        { label: '⏸️ Pausar Partida',    cmd: 'mp_pause_match',             cls: 'blue'   },
                                        { label: '▶️ Despausar',         cmd: 'mp_unpause_match',           cls: 'green'  },
                                        { label: '🌡️ Iniciar Warmup',    cmd: 'mp_warmup_start',            cls: 'orange' },
                                        { label: '⏭️ Pular Warmup',      cmd: 'mp_warmup_end',              cls: 'orange' },
                                        { label: '🤖 Limpar Bots',       cmd: 'bot_kick',                   cls: 'red'    },
                                        { label: '🔪 Faca apenas',       cmd: 'mp_give_player_c4 0; mp_buy_allow_knives 1; mp_startmoney 0; mp_restartgame 1', cls: 'purple' },
                                        { label: '💰 Reset Dinheiro',    cmd: 'mp_startmoney 16000; mp_restartgame 1', cls: 'cyan' },
                                        { label: '💡 God Mode',          cmd: 'sv_cheats 1; god',           cls: 'pink'   },
                                        { label: '🚫 Sem cheats',        cmd: 'sv_cheats 0',                cls: 'red'    },
                                        { label: '📢 Anunciar no chat',  cmd: '__custom_say__',             cls: 'zinc'   },
                                        { label: '🔁 Trocar de lado',    cmd: 'mp_swapteams; mp_restartgame 1', cls: 'yellow' },
                                    ].map(ctrl => (
                                        <button key={ctrl.label}
                                            onClick={() => {
                                                if (ctrl.cmd === '__custom_say__') {
                                                    const msg = prompt('Mensagem para anunciar no chat:');
                                                    if (msg) sendCommandRaw(`say ${msg}`);
                                                } else {
                                                    const cmds = ctrl.cmd.split(';').map(c => c.trim()).filter(Boolean);
                                                    cmds.forEach((c, i) => setTimeout(() => sendCommandRaw(c), i * 200));
                                                }
                                            }}
                                            className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-wide text-left transition-all active:scale-95 ${
                                                ctrl.cls === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' :
                                                ctrl.cls === 'blue'   ? 'bg-blue-500/10   border-blue-500/20   text-blue-400   hover:bg-blue-500/20' :
                                                ctrl.cls === 'green'  ? 'bg-green-500/10  border-green-500/20  text-green-400  hover:bg-green-500/20' :
                                                ctrl.cls === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' :
                                                ctrl.cls === 'red'    ? 'bg-red-500/10    border-red-500/20    text-red-400    hover:bg-red-500/20' :
                                                ctrl.cls === 'purple' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' :
                                                ctrl.cls === 'cyan'   ? 'bg-cyan-500/10   border-cyan-500/20   text-cyan-400   hover:bg-cyan-500/20' :
                                                ctrl.cls === 'pink'   ? 'bg-pink-500/10   border-pink-500/20   text-pink-400   hover:bg-pink-500/20' :
                                                'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {ctrl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CONFIG TAB */}
                        {serverControlTab === 'config' && (
                            <div className="p-5 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Configurações Gerais</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Nome do Servidor (hostname)</label>
                                            <div className="flex gap-2">
                                                <input id="cfg-hostname" type="text" placeholder="Tropa do CS2" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/50" />
                                                <button onClick={() => {
                                                    const val = (document.getElementById('cfg-hostname') as HTMLInputElement).value;
                                                    if(val) sendCommandRaw(`hostname "${val}"`);
                                                }} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 transition-all">Definir</button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Senha de Acesso (sv_password)</label>
                                            <div className="flex gap-2">
                                                <input id="cfg-password" type="text" placeholder="Vazio para sem senha" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/50" />
                                                <button onClick={() => {
                                                    const val = (document.getElementById('cfg-password') as HTMLInputElement).value;
                                                    sendCommandRaw(`sv_password "${val}"`);
                                                }} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-xl text-[9px] font-black uppercase border border-white/5 transition-all">Definir</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Configurações do MatchZy</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => sendCommandRaw('css_lo3')} className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[9px] font-black uppercase hover:bg-green-500/20 transition-all">Forçar LO3</button>
                                        <button onClick={() => sendCommandRaw('css_endmatch')} className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-500/20 transition-all">Encerrar Partida</button>
                                        <button onClick={() => sendCommandRaw('getall')} className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-500/20 transition-all">Get All (MatchZy)</button>
                                        <button onClick={() => sendCommandRaw('css_pause')} className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-[9px] font-black uppercase hover:bg-yellow-500/20 transition-all">Pausar MatchZy</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
