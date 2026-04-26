import { decodeCrosshairShareCode } from 'csgo-sharecode';

export interface CrosshairStyle {
    width: string;
    height: string;
    gap: string;
    thickness: string;
    dot: boolean;
    outline: boolean;
    color: string;
}

// Cores preset da Valve
const PRESET_COLORS: Record<number, string> = {
    0: '#ff3333',  // Red
    1: '#00ff00',  // Green
    2: '#ffff00',  // Yellow
    3: '#4488ff',  // Blue
    4: '#00ffff',  // Cyan
};

export function parseCrosshairCode(code: string): CrosshairStyle {
    try {
        if (!code || !code.startsWith('CSGO-')) throw new Error('Formato inválido');

        const decoded = decodeCrosshairShareCode(code);

        // DEBUG — remover após ajuste
        console.log('[crosshair-parser] decoded:', decoded);

        let color = '#00ff00';
        if (decoded.color === 5) {
            color = `rgb(${decoded.red}, ${decoded.green}, ${decoded.blue})`;
        } else {
            color = PRESET_COLORS[decoded.color] ?? '#00ff00';
        }

        const size = Math.max(0.5, decoded.length);
        // Se thickness for 0, visualmente representamos como 0.5px para ainda ser fininho e visível
        const thickness = Math.max(0.5, decoded.thickness || 0.5); 

        return {
            width:     `${size}px`,
            height:    `${size}px`,
            gap:       `${decoded.gap}px`,
            thickness: `${thickness}px`,
            dot:       !!decoded.centerDotEnabled,
            outline:   !!decoded.outlineEnabled,
            color,
        };
    } catch (err) {
        console.error('[crosshair-parser] error:', err);
        return {
            width:     '5px',
            height:    '5px',
            gap:       '0px',
            thickness: '1px',
            dot:       false,
            outline:   true,
            color:     '#00ff00',
        };
    }
}
