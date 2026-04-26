// Alfabeto CORRETO da Valve para share codes (Base57, não Base58)
const SHARECODE_ALPHABET = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';

function decodeCrosshairCode(code: string): Uint8Array {
    const cleaned = code.replace(/^CSGO-/, '').replace(/-/g, '');
    // CRÍTICO: a string deve ser INVERTIDA antes de decodificar
    const reversed = cleaned.split('').reverse().join('');

    let value = BigInt(0);
    for (const char of reversed) {
        const idx = SHARECODE_ALPHABET.indexOf(char);
        if (idx === -1) throw new Error(`Caractere inválido: ${char}`);
        value = value * BigInt(57) + BigInt(idx);
    }

    // Extrair 18 bytes em little-endian
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

export function parseCrosshairCode(code: string): CrosshairStyle {
    try {
        if (!code || !code.startsWith('CSGO-')) throw new Error('Formato inválido');

        const bytes = decodeCrosshairCode(code);

        // Mapeamento correto dos bytes (CS2 crosshair share code format)
        // Size: bytes[1..2] como uint16
        const size = ((bytes[2] << 8) | bytes[1]) / 10;
        // Thickness: bytes[3..4] como uint16
        const thickness = ((bytes[4] << 8) | bytes[3]) / 10;
        // Gap: bytes[5..6] como int16 (pode ser negativo)
        let rawGap = (bytes[6] << 8) | bytes[5];
        if (rawGap > 32767) rawGap -= 65536;
        const gap = rawGap / 10;

        // Color index: byte[8] (0=red, 1=green, 2=yellow, 3=blue, 4=cyan, 5=custom)
        const colorIndex = bytes[8];
        // Flags: byte[9] (bit0=dot, bit1=outline)
        const dot = (bytes[9] & 1) === 1;
        const outline = (bytes[9] & 2) === 2;
        // Custom RGB: bytes[11], [12], [13]
        const r = bytes[11];
        const g = bytes[12];
        const b = bytes[13];

        const PRESET_COLORS: Record<number, string> = {
            0: '#ff3333',
            1: '#00ff00',
            2: '#ffff00',
            3: '#4488ff',
            4: '#00ffff',
        };

        const color = colorIndex === 5
            ? `rgb(${r}, ${g}, ${b})`
            : (PRESET_COLORS[colorIndex] ?? '#00ff00');

        return {
            width: `${Math.max(0.5, size)}px`,
            height: `${Math.max(0.5, size)}px`,
            gap: `${gap}px`,
            thickness: `${Math.max(0.5, thickness)}px`,
            dot,
            outline,
            color,
        };
    } catch {
        return {
            width: '5px',
            height: '5px',
            gap: '0px',
            thickness: '1px',
            dot: false,
            outline: true,
            color: '#00ff00',
        };
    }
}
