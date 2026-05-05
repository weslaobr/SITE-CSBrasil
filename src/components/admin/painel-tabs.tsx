"use client";

import React, { useState } from 'react';
import { Terminal as ConsoleIcon, Map as MapIcon, HardDrive as DemoIcon, Users as UsersIcon, Trophy as MatchesIcon, Activity as QueueIcon } from 'lucide-react';
import { ServerDashboard } from "@/components/server/server-dashboard";
import MapPoolManager from "@/components/admin/map-pool-manager";
import DemosTab from "@/components/admin/demos-tab";
import UsersTab from "@/components/admin/users-tab";
import MatchesTab from "@/components/admin/matches-tab";
import QueueTab from "@/components/admin/queue-tab";

export function PainelTabs() {
    const [activeTab, setActiveTab] = useState<'server' | 'maps' | 'demos' | 'users' | 'matches' | 'queue'>('server');

    return (
        <div className="space-y-6">
            {/* Tab Selector */}
            <div className="px-6 md:px-10 mt-6">
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setActiveTab('server')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'server' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <ConsoleIcon size={14} />
                        Console
                    </button>
                    <button
                        onClick={() => setActiveTab('maps')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'maps' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <MapIcon size={14} />
                        Mapas
                    </button>
                    <button
                        onClick={() => setActiveTab('demos')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'demos' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <DemoIcon size={14} />
                        Demos
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'queue' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <QueueIcon size={14} />
                        Fila
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'matches' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <MatchesIcon size={14} />
                        Partidas
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <UsersIcon size={14} />
                        Usuários
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-6 md:px-10 pb-20">
                {activeTab === 'server' ? (
                    <ServerDashboard />
                ) : activeTab === 'maps' ? (
                    <MapPoolManager />
                ) : activeTab === 'demos' ? (
                    <DemosTab />
                ) : activeTab === 'matches' ? (
                    <MatchesTab />
                ) : activeTab === 'queue' ? (
                    <QueueTab />
                ) : (
                    <UsersTab />
                )}
            </div>
        </div>
    );
}
