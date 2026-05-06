"use client";
import React from 'react';
import MatchReportModal from './match-report-modal';
import TropaPremiumMatchReportModal from './tropa-premium-match-report-modal';

interface MatchModalManagerProps {
    match: any;
    matchId: string | null;
    isOpen: boolean;
    onClose: () => void;
    userSteamId?: string;
    userNickname?: string;
    onSync?: () => void;
}

/**
 * Centralized manager for Match Report Modals.
 * Automatically chooses between the Premium (Local Analyzer) and Standard (External API) modals
 * based on the match source and ID.
 */
export default function MatchModalManager({ 
    match, 
    matchId, 
    isOpen, 
    onClose, 
    userSteamId, 
    userNickname,
    onSync 
}: MatchModalManagerProps) {
    if (!isOpen) return null;

    // Logic to determine if it's a local/premium match
    const getIsLocal = () => {
        if (!match && !matchId) return false;
        
        const m = match || {};
        const id = matchId || m.id || '';
        const source = (m.source || m.gameMode || '').toLowerCase();
        
        return (
            source.includes('mix') ||
            source.includes('demo') ||
            source.includes('local') ||
            id.startsWith('manual_') ||
            // Local IDs are often short hashes, not UUIDs
            (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !id.includes('leetify'))
        );
    };

    const isLocal = getIsLocal();

    if (isLocal) {
        return (
            <TropaPremiumMatchReportModal
                matchId={matchId || match?.id || null}
                isOpen={isOpen}
                onClose={onClose}
                userSteamId={userSteamId}
                userNickname={userNickname}
            />
        );
    }

    return (
        <MatchReportModal
            match={match}
            matchId={matchId || match?.id || null}
            isOpen={isOpen}
            onClose={onClose}
            userSteamId={userSteamId}
            userNickname={userNickname}
            onSync={onSync}
        />
    );
}
