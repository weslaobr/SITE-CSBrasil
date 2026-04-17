import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldAlert, Lock } from "lucide-react";
import { getAuthOptions } from "@/lib/auth";
import { PainelTabs } from "@/components/admin/painel-tabs";

const ADMIN_STEAM_ID = "76561198024691636";

export const metadata = {
    title: "Painel Admin · TropaCS",
    description: "Painel de gerenciamento do servidor CS2 da TropaCS.",
    robots: { index: false, follow: false },
};

export default async function PainelPage() {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user) {
        redirect("/api/auth/signin/steam");
    }

    const steamId = (session.user as any).steamId;

    if (steamId !== ADMIN_STEAM_ID) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px]" />

                <div className="relative z-10 space-y-6 max-w-sm">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <Lock className="w-12 h-12 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">
                            Acesso <span className="text-red-500">Negado</span>
                        </h1>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Você não tem permissão para acessar o Painel Administrativo.
                            Certifique-se de que está logado com a conta Steam de Admin.
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl inline-block">
                        <code className="text-[10px] text-zinc-600 font-mono">SteamID: {steamId || "N/A"}</code>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Page Header */}
            <div className="relative border-b border-white/5 overflow-hidden">
                {/* BG glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative px-6 py-6 md:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Title */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert className="w-4 h-4 text-yellow-500" />
                            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.3em]">Ambiente Seguro</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                            PAINEL <span className="text-yellow-500">ADMIN</span>
                        </h1>
                    </div>

                    {/* Admin badge */}
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 self-start sm:self-auto">
                        <img
                            src={session.user?.image || ""}
                            alt="avatar"
                            className="w-8 h-8 rounded-lg border border-white/10"
                        />
                        <div>
                            <p className="text-xs font-black text-white leading-none">{session.user?.name}</p>
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider mt-0.5">Administrador</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content with Tabs */}
            <PainelTabs />
        </main>
    );
}
