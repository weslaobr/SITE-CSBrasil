"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Cpu, HardDrive, Play, Square, RefreshCw, Terminal,
    Network, WifiOff, Loader2, Send, Copy, Check, AlertTriangle,
    Clock, Server
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

    const consoleRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const retryRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { setMounted(true); }, []);

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
        setWsStatus('connecting');
        try {
            const res = await fetch('/api/server/console');
            if (!res.ok) { setWsStatus('disconnected'); return; }
            const { data } = await res.json();
            const ws = new WebSocket(data.socket);
            socketRef.current = ws;
            ws.onopen = () => {
                ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                setWsStatus('connected');
            };
            ws.onmessage = (ev) => {
                const msg = JSON.parse(ev.data);
                if (msg.event === 'console output' && msg.args?.[0]) {
                    setLogs(prev => [...prev.slice(-150), msg.args[0]]);
                }
            };
            ws.onclose = () => {
                setWsStatus('disconnected');
                retryRef.current = setTimeout(connectWs, 6000);
            };
            ws.onerror = () => ws.close();
        } catch { setWsStatus('disconnected'); }
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

    const sendCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim() || !socketRef.current || socketRef.current.readyState !== 1) return;
        socketRef.current.send(JSON.stringify({ event: 'send command', args: [command] }));
        setLogs(prev => [...prev, `> ${command}`]);
        setCommand('');
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
        </div>
    );
}
