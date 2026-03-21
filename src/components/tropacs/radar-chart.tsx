"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarData {
    subject: string;
    A: number;
    fullMark: number;
}

interface AttributesRadarChartProps {
    data: {
        aim?: number;
        utility?: number;
        positioning?: number;
        clutching?: number;
        opening?: number;
        [key: string]: any;
    } | null;
}

export default function AttributesRadarChart({ data }: AttributesRadarChartProps) {
    if (!data) return null;

    const chartData: RadarData[] = [
        { subject: 'Aim', A: data.aim || 0, fullMark: 100 },
        { subject: 'Utility', A: data.utility || 0, fullMark: 100 },
        { subject: 'Positioning', A: data.positioning || 0, fullMark: 100 },
        { subject: 'Clutching', A: data.clutching || 0, fullMark: 100 },
        { subject: 'Opening', A: data.opening || 0, fullMark: 100 },
    ];

    // Check if all values are zero
    const isAllZero = chartData.every(item => item.A === 0);

    if (isAllZero) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-zinc-900/50 rounded-3xl border border-white/5 p-8 text-center">
                <p className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                    Dados Insuficientes para Gráfico Radar
                </p>
                <p className="text-zinc-800 text-[8px] mt-2 uppercase tracking-tighter">
                    O Leetify ainda está calculando suas médias de performance
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-[320px] flex items-center justify-center bg-black/20 rounded-[40px] border border-white/5 p-2 backdrop-blur-xl relative overflow-hidden group">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" radialLines={true} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#71717a', fontSize: 10, fontWeight: 900, textAnchor: 'middle' }}
                    />
                    <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={false} 
                        axisLine={false} 
                    />
                    <Radar
                        name="Player Stats"
                        dataKey="A"
                        stroke="#22c55e"
                        strokeWidth={3}
                        fill="#22c55e"
                        fillOpacity={0.2}
                        animationDuration={1500}
                        animationBegin={0}
                        isAnimationActive={true}
                    />
                </RadarChart>
            </ResponsiveContainer>

            {/* Scale Indicators */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[50%] h-[50%] border border-white/[0.03] rounded-full" />
                <div className="absolute w-[25%] h-[25%] border border-white/[0.02] rounded-full" />
            </div>
        </div>
    );
}
