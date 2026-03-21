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
    Users
} from 'lucide-react';

const SidebarItem = ({ icon, label, active, collapsed, href }: { icon: any, label: string, active?: boolean, collapsed: boolean, href: string }) => (
    <Link
        href={href}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
    >
        <div className="flex-shrink-0">{icon}</div>
        {!collapsed && <span className="font-bold text-sm tracking-tight">{label}</span>}
    </Link>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();

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

                {/* Navigation */}
                <div className="flex-1 space-y-2">
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
                        icon={<Wind size={20} />}
                        label="Utilities"
                        active={pathname === '/tools'}
                        collapsed={collapsed}
                        href="/tools"
                    />
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="Mix 5x5"
                        active={pathname.startsWith('/lobby')}
                        collapsed={collapsed}
                        href="/lobby"
                    />
                </div>

                {/* Footer Sidebar */}
                <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
                    <SidebarItem
                        icon={<UserIcon size={20} />}
                        label="Meu Perfil"
                        collapsed={collapsed}
                        active={pathname.startsWith('/player/')}
                        href={session?.user && (session.user as any).steamId ? `/player/${(session.user as any).steamId}` : "/profile"}
                    />
                    {session && (
                        <>
                            <SidebarItem
                                icon={<RefreshCw size={20} />}
                                label="Sincronização"
                                collapsed={collapsed}
                                active={pathname === '/sync'}
                                href="/sync"
                            />
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
                    <button className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-black border-4 border-zinc-950 focus:outline-none"
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
                        {pathname === '/' ? 'Dashboard' : pathname.split('/').pop()} Overview
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-white">{session.user?.name}</p>
                                    <p className="text-[10px] text-green-500 font-bold uppercase">Player</p>
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
