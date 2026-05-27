"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PushNotificationSetupProps {
  compact?: boolean;
}

const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({ compact }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) {
      setIsLoading(false);
      return;
    }
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function subscribe() {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const pubKeyRes = await fetch("/api/push/vapid-public-key");
      if (!pubKeyRes.ok) throw new Error("VAPID não configurado");
      const { publicKey } = await pubKeyRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
            auth: arrayBufferToBase64(sub.getKey("auth")!)
          },
          userAgent: navigator.userAgent
        })
      });

      setIsSubscribed(true);
      toast.success("Notificações ativadas!", { description: "Você receberá alertas de partidas e convites." });
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Permissão negada", { description: "Permita notificações nas configurações do navegador." });
      } else {
        toast.error("Erro ao ativar", { description: err.message || "Tente novamente." });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
      }
      setIsSubscribed(false);
      toast.success("Notificações desativadas.");
    } catch {
      toast.error("Erro ao desativar notificações.");
    } finally {
      setIsLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading || !isSupported}
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all ${
          isSubscribed
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
        } disabled:opacity-50`}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isSubscribed ? (
          <Bell size={14} />
        ) : (
          <BellOff size={14} />
        )}
        {isSubscribed ? "Notificações On" : "Notificações Off"}
      </button>
    );
  }

  if (!isSupported) {
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AlertCircle size={16} className="text-zinc-600" />
          <p className="text-[10px] font-bold text-zinc-600">Notificações push não suportadas neste navegador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900/40 to-zinc-900/20 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isSubscribed ? "bg-emerald-500/10" : "bg-zinc-800"
          }`}>
            {isSubscribed ? (
              <Bell size={18} className="text-emerald-400" />
            ) : (
              <BellOff size={18} className="text-zinc-500" />
            )}
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-tight">Notificações Push</h3>
            <p className={`text-[9px] font-bold ${isSubscribed ? "text-emerald-400" : "text-zinc-600"} uppercase tracking-wider`}>
              {isSubscribed ? "Ativas" : "Inativas"}
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
            isSubscribed
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
          }`}
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin mx-auto" />
          ) : isSubscribed ? (
            "Desativar"
          ) : (
            "Ativar"
          )}
        </button>
      </div>

      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-white/5"
        >
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
            <CheckCircle2 size={12} />
            <span>Você receberá notificações de convites e partidas.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default PushNotificationSetup;
