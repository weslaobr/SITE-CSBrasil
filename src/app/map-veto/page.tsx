"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { MonitorPlay, Swords, ShieldAlert, Crosshair, Check, Gamepad2 } from 'lucide-react';

export default function MapVetoHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const [format, setFormat] = useState('BO3');
  const [knifeRound, setKnifeRound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateLobby = async () => {
    if (!session) {
      alert("Você precisa estar logado para criar um lobby");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/map-veto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, knifeRound })
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/map-veto/${data.id}`);
      } else {
        alert("Erro ao criar lobby: " + (data.error || "Desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar lobby");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">
      {/* ── HERO HEADER ── */}
      <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
              <Gamepad2 className="text-yellow-500 w-7 h-7 drop-shadow-[0_0_8px_rgba(246,203,2,0.6)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Veto de</span>
                <span className="text-yellow-500"> Mapas</span>
              </h1>
              <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                <span className="w-4 h-px bg-yellow-500/40" />
                Draft5 Style
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-zinc-500">Pedra-papel-tesoura e escolha de lados</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center hover:border-yellow-500/20 transition-colors"
        >
          <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-6">
            <Swords size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Criar Lobby 1v1</h2>
          <p className="text-zinc-400 mb-8 flex-grow">
            Ideal para campeonatos e mix. Inicie o lobby, envie o link para o adversário e iniciem o processo de veto.
          </p>

          <div className="w-full flex space-x-2 mb-6 bg-zinc-950 p-1 rounded-xl">
            {['BO1', 'BO3', 'BO5'].map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all text-sm ${
                  format === f
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Melhor de {f.replace('BO', '')}
              </button>
            ))}
          </div>

          <div className="w-full mb-8 text-left bg-zinc-950/50 p-4 rounded-xl border border-white/5">
            <label
              onClick={() => setKnifeRound(!knifeRound)}
              className="flex items-center gap-4 cursor-pointer group select-none"
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                  knifeRound ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-700 bg-zinc-800 group-hover:border-yellow-500/50'
                }`}
              >
                {knifeRound && <Check size={16} className="text-black stroke-[3px]" />}
              </div>
              <div>
                <span className="font-bold text-sm block text-zinc-200">Decidir lados por faca</span>
                <span className="text-xs text-zinc-500 leading-tight">Os líderes não escolherão lados no site.</span>
              </div>
            </label>
          </div>

          <button
            onClick={handleCreateLobby}
            disabled={loading || !session}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <MonitorPlay size={20} />
            {loading ? 'Criando...' : session ? 'Criar Lobby' : 'Faça login para criar'}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          {[
            { icon: <ShieldAlert className="text-blue-400" />, title: "Pedra, Papel e Tesoura", desc: "Decida de forma justa quem tem a vantagem de iniciar os Picks ou Bans." },
            { icon: <Crosshair className="text-red-400" />, title: "Escolha de Lados", desc: "No final dos picks, os jogadores selecionam se iniciam de TR ou CT nos mapas." },
            { icon: <MonitorPlay className="text-green-400" />, title: "Sincronização ao Vivo", desc: "Acompanhe todo o processo de veto em tempo real (Real-time updates)." }
          ].map((feature, i) => (
            <div key={i} className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 flex gap-4 items-start hover:border-white/10 transition-colors">
              <div className="bg-zinc-950 p-3 rounded-xl mt-1">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                <p className="text-zinc-400 text-sm">{feature.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
