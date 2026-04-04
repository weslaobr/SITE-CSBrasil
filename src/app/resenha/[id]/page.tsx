"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Star, Trash, Search, Shield, Target, Brain, Crosshair, Zap, Activity } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

function PlayerEvaluationCard({ evalData, isOwner, onDelete }: { evalData: any; isOwner: boolean; onDelete: (id: string) => void }) {
  const chartData = [
    { subject: "Mira", A: evalData.aimScore, fullMark: 10 },
    { subject: "Util", A: evalData.utilityScore, fullMark: 10 },
    { subject: "Pos", A: evalData.positioningScore, fullMark: 10 },
    { subject: "Duelos", A: evalData.duelScore, fullMark: 10 },
    { subject: "Clutch", A: evalData.clutchScore, fullMark: 10 },
    { subject: "Decisão", A: evalData.decisionScore, fullMark: 10 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col group hover:border-yellow-500/30 transition-all backdrop-blur-md relative"
    >
      {isOwner && (
        <button 
          onClick={() => onDelete(evalData.id)}
          className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all z-10 opacity-0 group-hover:opacity-100"
          title="Remover Avaliação"
        >
          <Trash size={14} />
        </button>
      )}

      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-yellow-500 text-lg border border-white/5">
            {evalData.evaluatedPlayerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-white uppercase truncate max-w-[150px] sm:max-w-xs">{evalData.evaluatedPlayerName}</h3>
            {evalData.evaluatedSteamId && <p className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-zinc-500 font-mono inline-block">Steam vinculada</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Geral</p>
          <p className="text-2xl font-black italic text-yellow-400">{Number(evalData.overallScore).toFixed(1)}</p>
        </div>
      </div>

      <div className="p-4 h-64 relative bg-gradient-to-b from-transparent to-black/20">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#eab308', fontWeight: 'bold' }}
            />
            <Radar name="Nota" dataKey="A" stroke="#eab308" fill="#eab308" fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {evalData.notes && (
        <div className="p-4 bg-zinc-950/50 border-t border-white/5">
          <p className="text-xs text-zinc-400 italic">"{evalData.notes}"</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ResenhaViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [list, setList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Add dialog state
  const [showAddModal, setShowAddModal] = useState(false);
  const [steamId, setSteamId] = useState("");
  const [scores, setScores] = useState({ aim: 5, utility: 5, pos: 5, duel: 5, clutch: 5, decision: 5 });
  const [notes, setNotes] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetchList();
    fetchPlayers();
  }, [unwrappedParams.id]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/ranking");
      if (res.ok) {
        const data = await res.json();
        const playersList = data.players || data;
        if (Array.isArray(playersList)) {
          setDbPlayers(playersList);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchList = async () => {
    try {
      const res = await fetch(`/api/resenha/${unwrappedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setList(data);
      } else {
        router.push("/resenha");
      }
    } catch (e) {
      console.error(e);
      router.push("/resenha");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamId.trim()) return;

    setAddingPlayer(true);
    try {
      const res = await fetch(`/api/resenha/${unwrappedParams.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluatedSteamId: steamId,
          aimScore: scores.aim,
          utilityScore: scores.utility,
          positioningScore: scores.pos,
          duelScore: scores.duel,
          clutchScore: scores.clutch,
          decisionScore: scores.decision,
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSteamId("");
        setScores({ aim: 5, utility: 5, pos: 5, duel: 5, clutch: 5, decision: 5 });
        setNotes("");
        fetchList(); // Refresh
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao adicionar jogador.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de comunicação.");
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleDeletePlayer = async (evalId: string) => {
    if (!confirm("Tem certeza que deseja remover este jogador da lista?")) return;
    try {
      const res = await fetch(`/api/resenha/${unwrappedParams.id}/players?evaluationId=${evalId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchList();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteList = async () => {
    if (!confirm("Deseja realmente deletar a resenha inteira?")) return;
    try {
      const res = await fetch(`/api/resenha/${unwrappedParams.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/resenha");
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-yellow-500 w-10 h-10" />
      </div>
    );
  }

  if (!list) return null;

  // Since session.user.email is used internally to find the user id, we will just use logic like 
  // checking if there is session to show the add button if they are potentially owner, 
  // or we compare emails if list.creator.email was populated. But actually our API handles authorization securely.
  // We can just show the Add button if there is a session.
  const canEdit = session != null; 

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="relative bg-zinc-900/60 p-8 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <Link href="/resenha" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
              <ArrowLeft size={14} /> Voltar
            </Link>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
                {list.title}
              </h1>
              {list.description && (
                <p className="text-zinc-400 mt-2 text-sm max-w-xl">{list.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 bg-black/40 p-2 pr-6 rounded-full w-fit border border-white/5">
              {list.creator?.image ? (
                <img src={list.creator.image} className="w-8 h-8 rounded-full border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Star size={12} className="text-zinc-500" />
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Criado por</p>
                <p className="text-xs text-white font-black">{list.creator?.name || "Usuário"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  <Plus size={16} /> Avaliar Jogador
                </button>
                <button 
                  onClick={handleDeleteList}
                  className="flex items-center justify-center w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                  title="Excluir Lista"
                >
                  <Trash size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* GRID OF PLAYERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.evaluations.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-zinc-900/20">
            <Star size={48} className="text-zinc-800 mb-4" />
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest text-center">
              Nenhum jogador avaliado ainda.<br /> 
              {canEdit ? "Clique em 'Avaliar Jogador' para começar." : ""}
            </p>
          </div>
        ) : (
          list.evaluations.map((ev: any) => (
             <PlayerEvaluationCard key={ev.id} evalData={ev} isOwner={canEdit} onDelete={handleDeletePlayer} />
          ))
        )}
      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black italic uppercase text-white mb-6">
                Nova <span className="text-yellow-500">Avaliação</span>
              </h2>

              <form onSubmit={handleAddPlayer} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Search size={14} /> Selecione o Jogador <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={steamId}
                    onChange={(e) => setSteamId(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 transition-all font-mono appearance-none"
                  >
                    <option value="" disabled>Escolha um jogador da lista...</option>
                    {dbPlayers.map(p => (
                      <option key={p.steamId} value={p.steamId}>
                        {p.nickname} (Steam: {p.steamId})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">A lista exibe jogadores cadastrados e analisados pelo site.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'aim', label: 'Mira', icon: Target },
                    { key: 'utility', label: 'Utilitários', icon: Shield },
                    { key: 'pos', label: 'Posicionamento', icon: Crosshair },
                    { key: 'duel', label: 'Duelos', icon: Zap },
                    { key: 'clutch', label: 'Clutch', icon: Activity },
                    { key: 'decision', label: 'Decisão de Jogo', icon: Brain },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                          <Icon size={14} className="text-yellow-500" /> {field.label}: <span className="text-white text-base ml-auto">{scores[field.key as keyof typeof scores]}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={scores[field.key as keyof typeof scores]}
                          onChange={(e) => setScores({ ...scores, [field.key]: parseFloat(e.target.value) })}
                          className="w-full accent-yellow-500 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                    Observações / Resenha Mítica
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mirela, mas sem cérebro..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 transition-all resize-none h-20"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 rounded-xl font-bold uppercase text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={addingPlayer}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-black uppercase text-xs transition-all shadow-lg disabled:opacity-50"
                  >
                    {addingPlayer ? <Loader2 size={16} className="animate-spin" /> : "Salvar Avaliação"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
