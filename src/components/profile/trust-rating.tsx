"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface TrustRatingProps {
    rating: number;
    status: string;
}

function getColor(rating: number): string {
    if (rating >= 85) return '#22c55e';
    if (rating >= 70) return '#22c55e';
    if (rating >= 50) return '#eab308';
    if (rating >= 30) return '#f97316';
    return '#ef4444';
}

function getStatusColor(rating: number): string {
    if (rating >= 85) return '#22c55e';
    if (rating >= 70) return '#22c55e';
    if (rating >= 50) return '#eab308';
    if (rating >= 30) return '#f97316';
    return '#ef4444';
}

const TrustRating: React.FC<TrustRatingProps> = ({ rating, status }) => {
    const color = getColor(rating);
    const statusColor = getStatusColor(rating);
    const strokeDasharray = 2 * Math.PI * 72;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * rating) / 100;

    return (
        <div className="flex flex-col items-center justify-center relative py-2">
            <svg className="w-44 h-44 transform -rotate-90 drop-shadow-xl">
                <defs>
                    <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </linearGradient>
                    <filter id="trustGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <circle cx="88" cy="88" r="72" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-800/30" />
                <motion.circle
                    cx="88" cy="88" r="72" stroke={`url(#trustGradient)`}
                    strokeWidth="8" fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: strokeDasharray }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    filter="url(#trustGlow)"
                    style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="text-4xl font-black italic tracking-tighter"
                    style={{ color }}
                >
                    {rating}%
                </motion.span>
                <span className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-500 mt-0.5">Nível de Confiança</span>
            </div>
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-2 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border"
                style={{
                    background: `${statusColor}12`,
                    color: statusColor,
                    borderColor: `${statusColor}25`,
                }}
            >
                {status || 'Normal'}
            </motion.div>
        </div>
    );
};

export default TrustRating;
