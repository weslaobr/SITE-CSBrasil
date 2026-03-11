"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarData {
    subject: string;
    A: number;
    fullMark: number;
}

interface AttributesRadarChartProps {
    data: {
        aim: number;
        utility: number;
        positioning: number;
        clutching: number;
        opening: number;
    };
}

export default function AttributesRadarChart({ data }: AttributesRadarChartProps) {
    const chartData: RadarData[] = [
        { subject: 'Aim', A: data.aim, fullMark: 100 },
        { subject: 'Utility', A: data.utility, fullMark: 100 },
        { subject: 'Positioning', A: data.positioning, fullMark: 100 },
        { subject: 'Clutching', A: data.clutching, fullMark: 100 },
        { subject: 'Opening', A: data.opening, fullMark: 100 },
    ];

    return (
        <div className="w-full h-[300px] flex items-center justify-center bg-zinc-900/50 rounded-3xl border border-white/5 p-4 backdrop-blur-xl">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Player Stats"
                        dataKey="A"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
