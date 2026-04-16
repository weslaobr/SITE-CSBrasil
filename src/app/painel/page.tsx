import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ServerDashboard } from "@/components/server/server-dashboard";
import { ShieldAlert, Lock } from "lucide-react";
import { getAuthOptions } from "@/lib/auth";

const ADMIN_STEAM_ID = "76561198024691636";

export default async function PainelPage() {
    const session = await getServerSession(getAuthOptions());

    // Redireciona se não estiver logado
    if (!session?.user) {
        redirect("/api/auth/signin/steam");
    }

    const steamId = (session.user as any).steamId;

    // Verificação de Admin (Steam ID específico)
    if (steamId !== ADMIN_STEAM_ID) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                    Acesso <span className="text-red-500">Restrito</span>
                </h1>
                <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
                    Desculpe, você não tem permissão para acessar o Painel Administrativo do servidor. 
                    Se você é um administrador, verifique se está logado com a conta Steam correta.
                </p>
                <div className="mt-8 px-4 py-2 bg-white/5 border border-white/5 rounded-lg">
                    <code className="text-[10px] text-zinc-600 font-mono">ID: {steamId || "Não identificado"}</code>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950">
            {/* Header da Página */}
            <header className="px-8 py-8 md:px-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="w-5 h-5 text-yellow-500" />
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.3em]">Ambiente Seguro</p>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                            PAINEL <span className="text-yellow-500">ADMIN</span>
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xs text-left md:text-right border-l md:border-l-0 md:border-r border-white/10 pl-4 md:pl-0 md:pr-4">
                        Gerenciamento direto do servidor CS2 Firegames
                    </p>
                </div>
            </header>

            {/* O Dashboard */}
            <ServerDashboard />
        </main>
    );
}
