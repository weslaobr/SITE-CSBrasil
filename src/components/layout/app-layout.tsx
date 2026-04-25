"use client";
import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Trophy,
    Wind,
    Calculator,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User as UserIcon,
    ShieldCheck,
    Package,
    Gamepad2,
    RefreshCw,
    Users,
    Map,
    Swords,
    Medal,
    MessageSquareQuote,
    Server,
    Terminal,
    MessageSquare
} from 'lucide-react';

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 127.14 96.36" 
        fill="currentColor"
    >
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C130.46,50.45,125.12,26.8,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.43-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
    </svg>
);

const SidebarItem = ({ icon, label, active, collapsed, href }: { icon: any, label: string, active?: boolean, collapsed: boolean, href: string }) => (
    <Link
        href={href}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
    >
        <div className="flex-shrink-0">{icon}</div>
        {!collapsed && <span className="font-bold text-sm tracking-tight">{label}</span>}
    </Link>
);

const SidebarSectionLabel = ({ label, collapsed }: { label: string, collapsed: boolean }) => (
    <div className={`px-4 mt-6 mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}>
        {collapsed ? (
            <div className="w-8 h-[1px] bg-white/10" />
        ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {label}
            </span>
        )}
    </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();

    const mySteamId = (session?.user as any)?.steamId;
    const isAdmin = (session?.user as any)?.isAdmin;
    const isPlayerRoute = pathname.startsWith('/player/');
    const viewedPlayerId = isPlayerRoute ? pathname.split('/')[2] : null;

    // Logic to distinguish 'Meu Perfil' from 'Perfil do Jogador'
    const isViewingOtherPlayer = isPlayerRoute && viewedPlayerId && viewedPlayerId !== mySteamId;
    const profileLabel = isViewingOtherPlayer ? "Perfil do Jogador" : "Meu Perfil";
    const profileHref = isViewingOtherPlayer
        ? `/player/${viewedPlayerId}`
        : (mySteamId ? `/player/${mySteamId}` : "/profile");

    return (
        <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 80 : 260 }}
                className="relative flex flex-col border-r border-white/5 bg-zinc-900/40 backdrop-blur-xl p-4 z-50 transition-all"
            >
                {/* Logo */}
                <div className="flex items-center justify-center mb-6 overflow-hidden">
                    <div className={`${collapsed ? 'w-8 h-8' : 'w-full h-32'} flex items-center justify-center flex-shrink-0 transition-all px-0`}>
                        <img
                            src="/img/logotipo-tropacs-retangular-pequeno.png"
                            alt="TropaCS Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>

                {/* Navigation Scrollable Area */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                    <SidebarSectionLabel label="Principal" collapsed={collapsed} />
                    <SidebarItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        active={pathname === '/dashboard' || pathname === '/'}
                        collapsed={collapsed}
                        href="/"
                    />
                    <SidebarItem
                        icon={<Trophy size={20} />}
                        label="Ranking"
                        active={pathname === '/ranking'}
                        collapsed={collapsed}
                        href="/ranking"
                    />
                    <SidebarItem
                        icon={<Server size={20} />}
                        label="Servidor"
                        active={pathname === '/jogar'}
                        collapsed={collapsed}
                        href="/jogar"
                    />

                    <SidebarSectionLabel label="Competitivo" collapsed={collapsed} />
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="Mix 5x5"
                        active={pathname.startsWith('/lobby')}
                        collapsed={collapsed}
                        href="/lobby"
                    />
                    <SidebarItem
                        icon={<Medal size={20} />}
                        label="Torneios"
                        active={pathname.startsWith('/tournaments')}
                        collapsed={collapsed}
                        href="/tournaments"
                    />
                    <SidebarItem
                        icon={<Gamepad2 size={20} />}
                        label="Veto de Mapas"
                        active={pathname.startsWith('/map-veto')}
                        collapsed={collapsed}
                        href="/map-veto"
                    />

                    <SidebarSectionLabel label="Análise & Tools" collapsed={collapsed} />
                    <SidebarItem
                        icon={<Map size={20} />}
                        label="Stats de Mapas"
                        active={pathname === '/maps'}
                        collapsed={collapsed}
                        href="/maps"
                    />
                    <SidebarItem
                        icon={<Swords size={20} />}
                        label="Head to Head"
                        active={pathname === '/compare'}
                        collapsed={collapsed}
                        href="/compare"
                    />
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="Gerador de Times"
                        active={pathname.startsWith('/team-builder')}
                        collapsed={collapsed}
                        href="/team-builder"
                    />
                    <SidebarItem
                        icon={<Wind size={20} />}
                        label="Utilidades"
                        active={pathname === '/tools'}
                        collapsed={collapsed}
                        href="/tools"
                    />

                    <SidebarSectionLabel label="Comunidade" collapsed={collapsed} />
                    <SidebarItem
                        icon={<MessageSquareQuote size={20} />}
                        label="Resenha"
                        active={pathname.startsWith('/resenha')}
                        collapsed={collapsed}
                        href="/resenha"
                    />
                    <a
                        href="https://discord.gg/QGGckW8EAN"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-[#5865F2] hover:bg-[#5865F2]/10 hover:shadow-[0_0_20px_rgba(88,101,242,0.2)]`}
                    >
                        <div className="flex-shrink-0">
                            <DiscordIcon size={20} />
                        </div>
                        {!collapsed && <span className="font-bold text-sm tracking-tight">Discord</span>}
                    </a>

                    {isAdmin && (
                        <>
                            <SidebarSectionLabel label="Administração" collapsed={collapsed} />
                            <SidebarItem
                                icon={<Terminal size={20} />}
                                label="Painel Admin"
                                active={pathname === '/painel'}
                                collapsed={collapsed}
                                href="/painel"
                            />
                        </>
                    )}
                </div>

                {/* Footer Sidebar (User Specific) */}
                <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
                    <SidebarSectionLabel label="Sua Conta" collapsed={collapsed} />
                    <SidebarItem
                        icon={<UserIcon size={20} />}
                        label={profileLabel}
                        collapsed={collapsed}
                        active={pathname.startsWith('/player/')}
                        href={profileHref}
                    />
                    {session && (
                        <>
                            <SidebarItem
                                icon={<Package size={20} />}
                                label="Meu Inventário"
                                collapsed={collapsed}
                                active={pathname === '/inventory'}
                                href="/inventory"
                            />
                            <SidebarItem
                                icon={<Gamepad2 size={20} />}
                                label="Minhas Partidas"
                                collapsed={collapsed}
                                active={pathname === '/matches'}
                                href="/matches"
                            />
                        </>
                    )}
                    <SidebarItem
                        icon={<Settings size={20} />}
                        label="Configurações"
                        collapsed={collapsed}
                        active={pathname === '/settings'}
                        href="/settings"
                    />
                    <button className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black border-4 border-zinc-950 focus:outline-none z-[60]"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight size={14} fill="currentColor" /> : <ChevronLeft size={14} fill="currentColor" />}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/20 via-zinc-950 to-zinc-950">
                {/* Top Header/Bar */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-900/20 sticky top-0 backdrop-blur-md z-40">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        {pathname === '/' ? 'Dashboard' : pathname.split('/').pop()} Geral
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-white">{session.user?.name}</p>
                                    <p className="text-[10px] text-yellow-500 font-bold uppercase">{(session.user as any).isAdmin ? 'Administrador' : 'Jogador'}</p>
                                </div>
                                <img
                                    src={session.user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                    alt="User Avatar"
                                    className="w-8 h-8 rounded-lg border border-white/10"
                                />
                                <button
                                    onClick={() => signOut()}
                                    className="text-zinc-500 hover:text-red-500 transition-colors"
                                >
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => signIn('steam')}
                                className="bg-[#171A21] hover:bg-[#2a2e38] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-white/10"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M11.979 0C5.353 0 0 5.353 0 11.979c0 4.678 2.68 8.718 6.576 10.742l1.9-5.462a6.398 6.398 0 0 1-1.353-2.18l-3.955 1.637v-.235c.108-1.503 1.096-2.793 2.502-3.35v1.896c0 .778.63 1.408 1.408 1.408h.084l3.125-4.482a4.67 4.67 0 0 1 1.766-.584V9.652c0-.777.63-1.407 1.407-1.407 1.602 0 2.906 1.303 2.906 2.905 0 1.604-1.304 2.907-2.906 2.907-.156 0-.31-.013-.46-.038L9.89 18.57a5.536 5.536 0 0 0 2.089.412c6.626 0 11.98-5.354 11.98-11.98S18.605 0 11.98 0z" />
                                </svg>
                                Entrar com a Steam
                            </button>
                        )}
                    </div>
                </header>

                <div className="relative">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
