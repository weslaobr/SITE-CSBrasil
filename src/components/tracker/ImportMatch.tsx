"use client";

import { useState } from "react";
import { Rocket, History, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function ImportMatch() {
  const [steamid, setSteamid] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!steamid || !authCode) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/importer/import-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamid, auth_code: authCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      } else {
        setError(data.detail || "Erro ao importar.");
      }
    } catch (err) {
      setError("Erro na conexão com o backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[40px] backdrop-blur-3xl">
        <div className="space-y-2 mb-8">
            <h2 className="flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter">
              <Rocket className="text-yellow-500 w-6 h-6" />
              Vincular Histórico Steam
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
              Conecte seu histórico de partidas para análise profunda.
            </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 font-mono">SteamID64</label>
            <input
              placeholder="76561198XXXXXXXXX"
              value={steamid}
              onChange={(e) => setSteamid(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white uppercase italic tracking-wider text-sm placeholder:text-zinc-700 focus:outline-none focus:border-yellow-500/50 transition-colors"
            />
          </div>

          <div className="grid gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 font-mono">Authentication Code</label>
            <input
              placeholder="XXXX-XXXXX-XXXX"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white uppercase italic tracking-wider text-sm placeholder:text-zinc-700 focus:outline-none focus:border-yellow-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase px-4">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button 
            onClick={handleImport} 
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:hover:bg-yellow-500 text-black font-black uppercase italic tracking-tighter py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-yellow-500/10"
          >
            {loading ? <Loader2 className="animate-spin" /> : <History size={20} />}
            SINCRONIZAR PARTIDAS
          </button>
        </div>
      </div>

      {status && (
        <div className="bg-green-500/5 border border-green-500/20 p-8 rounded-[40px] flex items-center gap-6">
          <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400">
             <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="font-black italic uppercase tracking-tighter text-green-400">{status.message}</p>
            <p className="text-[10px] text-green-500/60 font-black uppercase tracking-widest mt-1">
              {status.matches?.length || 0} PARTIDAS IDENTIFICADAS PARA PROCESSAMENTO
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
