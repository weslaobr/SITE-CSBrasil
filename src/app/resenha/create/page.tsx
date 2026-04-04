"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CreateResenhaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/resenha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, isPublic }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/resenha/${data.id}`);
      } else {
        alert("Erro ao criar resenha.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao criar resenha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
      <Link href="/resenha" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Voltar para as Listas
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/40 p-6 md:p-10 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-black italic uppercase text-white mb-2 tracking-tighter">
            Criar Nova <span className="text-yellow-400">Resenha</span>
          </h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-8">
            Dê nome e visibilidade para a sua lista de avaliações.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                Título da Resenha <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Tropa do Faceit, Amigos do DM..."
                required
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte sobre o que é essa resenha..."
                rows={4}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/50 p-4 rounded-xl border border-white/5">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 accent-yellow-500 bg-zinc-900 border-white/10 rounded cursor-pointer"
              />
              <label htmlFor="isPublic" className="font-bold text-sm text-zinc-300 cursor-pointer">
                Tornar lista pública
                <span className="block text-xs text-zinc-500 font-normal mt-0.5">
                  Outros usuários poderão ver esta lista na página inicial.
                </span>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-black uppercase text-sm transition-all shadow-lg shadow-yellow-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Criar Resenha
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
