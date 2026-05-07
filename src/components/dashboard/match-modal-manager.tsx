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
    // Logic to determine if it's a local/premium match
    const isLocal = (() => {
        const m = match || {};
        const id = String(matchId || m.id || m.externalId || '');
        const source = String(m.source || m.gameMode || '').toLowerCase();
        
        // Use the new Premium Modal for almost everything now, as it's the user's preference.
        // We only exclude Faceit if it's specifically not working there, but the user asked for Competitive/Premier.
        if (id.startsWith('manual_')) return true;
        if (source.includes('mix') || source.includes('demo') || source.includes('local')) return true;
        if (source.includes('competitive') || source.includes('premier') || source.includes('valve') || source.includes('matchmaking')) return true;
        
        // If it's a UUID, it's likely a Leetify match which we now want in the premium modal
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) return true;
        
        return false;
    })();

    // Clean matchId for API calls (strip leetify- or faceit- prefixes if present)
    const rawId = matchId || match?.id || match?.externalId || null;
    const cleanMatchId = typeof rawId === 'string' ? rawId.replace(/^(leetify-|faceit-)/, '') : rawId;

    if (isLocal) {
        return (
            <TropaPremiumMatchReportModal
                matchId={cleanMatchId}
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
            matchId={cleanMatchId}
            isOpen={isOpen}
            onClose={onClose}
            userSteamId={userSteamId}
            userNickname={userNickname}
            onSync={onSync}
        />
    );
}
