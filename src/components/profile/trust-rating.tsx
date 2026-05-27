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

const TrustRating: React.FC<TrustRatingProps> = ({ rating, status }) => {
    const color = getColor(rating);
    const r = 40;
    const strokeDasharray = 2 * Math.PI * r;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * rating) / 100;

    return (
        <div className="flex flex-col items-center justify-center relative w-full max-w-[140px] mx-auto">
            <svg viewBox="0 0 96 96" className="w-full transform -rotate-90">
                <defs>
                    <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </linearGradient>
                </defs>
                <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-800/30" />
                <motion.circle
                    cx="48" cy="48" r={r} fill="none" stroke="url(#tg)"
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: strokeDasharray }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="text-lg font-black italic tracking-tight" style={{ color }}
                >
                    {rating}%
                </motion.span>
                <span className="text-[6px] font-black uppercase tracking-[0.1em] text-zinc-600">Confiança</span>
            </div>
            <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-1 px-2.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest border"
                style={{ background: `${color}12`, color, borderColor: `${color}25` }}
            >
                {status || 'Normal'}
            </motion.div>
        </div>
    );
};

export default TrustRating;
