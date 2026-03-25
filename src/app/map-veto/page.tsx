"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { MonitorPlay, Swords, ShieldAlert, Crosshair, Check } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0a0f16] flex flex-col items-center justify-center text-white py-20 px-4">
      <div className="max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#ffe45c] to-[#ffb800]">
            SISTEMA DE VETO DE MAPAS
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Crie um lobby para 2 líderes e realize o veto de mapas (Draft5 / Mapban style). 
            Jogue pedra, papel e tesoura para decidir os picks e escolha lados profissionalmente.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#111823] p-8 rounded-2xl border border-gray-800 flex flex-col items-center text-center hover:border-yellow-400/30 transition-colors"
          >
            <div className="w-16 h-16 bg-yellow-400/10 text-yellow-500 rounded-full flex items-center justify-center mb-6">
              <Swords size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Criar Lobby 1v1</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Ideal para campeonatos e mix. Inicie o lobby, envie o link para o adversário e iniciem o processo de veto.
            </p>

            <div className="w-full flex space-x-2 mb-6 bg-gray-900 p-1 rounded-xl">
              {['BO1', 'BO3', 'BO5'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all text-sm ${
                    format === f 
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Melhor de {f.replace('BO', '')}
                </button>
              ))}
            </div>

            <div className="w-full mb-8 text-left bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <label 
                onClick={() => setKnifeRound(!knifeRound)}
                className="flex items-center gap-4 cursor-pointer group select-none"
              >
                <div 
                  className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                    knifeRound ? 'bg-yellow-500 border-yellow-500' : 'border-gray-700 bg-gray-800 group-hover:border-yellow-500/50'
                  }`}
                >
                  {knifeRound && <Check size={16} className="text-black stroke-[3px]" />}
                </div>
                <div>
                  <span className="font-bold text-sm block text-gray-200">Decidir lados por faca</span>
                  <span className="text-xs text-gray-500 leading-tight">Os líderes não escolherão lados no site.</span>
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
              <div key={i} className="bg-[#111823] p-6 rounded-2xl border border-gray-800 flex gap-4 items-start">
                <div className="bg-gray-900 p-3 rounded-xl mt-1">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
