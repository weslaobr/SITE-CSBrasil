// Alfabeto CORRETO da Valve para share codes (Base57)
const SHARECODE_ALPHABET = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';

function decodeToBytes(code: string): Uint8Array {
    const cleaned = code.replace(/^CSGO-/, '').replace(/-/g, '');
    // A string é invertida antes de decodificar (little-endian)
    const reversed = cleaned.split('').reverse().join('');

    let value = BigInt(0);
    for (const char of reversed) {
        const idx = SHARECODE_ALPHABET.indexOf(char);
        if (idx === -1) throw new Error(`Caractere inválido: ${char}`);
        value = value * BigInt(57) + BigInt(idx);
    }

    // Extrai 18 bytes little-endian
    const bytes = new Uint8Array(18);
    for (let i = 0; i < 18; i++) {
        bytes[i] = Number(value & BigInt(0xff));
        value >>= BigInt(8);
    }
    return bytes;
}

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

        const bytes = decodeToBytes(code);

        // DEBUG — remover após ajuste
        console.log('[crosshair-parser] bytes:', Array.from(bytes).map((b, i) => `[${i}]=${b}`).join(' '));

        // ── Byte layout (CS2 crosshair share code) ──────────────────────
        // byte[0]     = header / version (ignorar)
        // byte[1]     = gap (int8 signed)
        // byte[2]     = outline thickness (uint8) / 2.0
        // byte[3]     = red   (uint8)
        // byte[4]     = green (uint8)
        // byte[5]     = blue  (uint8)
        // byte[6]     = alpha (uint8)
        // byte[7]     = split dist
        // byte[8]     = color preset (0-5)
        // byte[9]     = draw outline flag (bool)
        // byte[10]    = inner split alpha
        // byte[11]    = outer split alpha
        // byte[12]    = split (bool)
        // byte[13]    = use weapon value (bool)
        // byte[14-15] = size as uint16 (value / 10.0)
        // byte[16-17] = thickness as uint16 (value / 10.0)
        // ────────────────────────────────────────────────────────────────

        // Gap: byte[1] como int8 (signed)
        const rawGap = bytes[1] > 127 ? bytes[1] - 256 : bytes[1];
        const gap = Math.max(-10, Math.min(15, rawGap));

        // Cor preset
        const colorIndex = bytes[8];
        const r = bytes[3];
        const g = bytes[4];
        const b = bytes[5];
        const color = colorIndex === 5
            ? `rgb(${r}, ${g}, ${b})`
            : (PRESET_COLORS[colorIndex] ?? '#00ff00');

        // Dot e Outline (flags)
        const dot    = bytes[13] > 0; // simplificação
        const outline = bytes[9] > 0;

        // Size: bytes[14..15] uint16
        const rawSize = ((bytes[15] << 8) | bytes[14]);
        const size = Math.max(0.5, Math.min(20, rawSize / 10));

        // Thickness: bytes[16..17] uint16
        const rawThick = ((bytes[17] << 8) | bytes[16]);
        const thickness = Math.max(0.5, Math.min(6, rawThick / 10));

        return {
            width:     `${size}px`,
            height:    `${size}px`,
            gap:       `${gap}px`,
            thickness: `${thickness}px`,
            dot,
            outline,
            color,
        };
    } catch {
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
