"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface TrustRatingProps {
    rating: number;
    status: string;
}

const TrustRating: React.FC<TrustRatingProps> = ({ rating, status }) => {
    const strokeDasharray = 2 * Math.PI * 64;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * rating) / 100;

    return (
        <div className="flex flex-col items-center justify-center relative">
            <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Circle */}
                <circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-zinc-800/50"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: strokeDasharray }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-emerald-500"
                    strokeLinecap="round"
                />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl font-black italic text-white"
                >
                    {rating}%
                </motion.span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-0.5">Nível de Confiança</span>
            </div>

            <div className="absolute -bottom-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg">
                {status || 'Normal'}
            </div>
        </div>
    );
};

export default TrustRating;
