/**
 * Decodificador básico para códigos de mira do CS2 (CSGO-XXXXX)
 * O código é Base58. Após decodificar, ele contém bytes que mapeiam para:
 * Gap, Outline, Red, Green, Blue, Alpha, Size, Thickness, Dot, etc.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

function decodeBase58(str: string): Uint8Array {
    let result = BigInt(0);
    for (const char of str) {
        if (ALPHABET_MAP[char] === undefined) continue;
        result = result * BigInt(58) + BigInt(ALPHABET_MAP[char]);
    }
    
    // O código da Valve decodificado DEVE ter 18 bytes (144 bits)
    const bytes = new Uint8Array(18);
    for (let i = 17; i >= 0; i--) {
        bytes[i] = Number(result & BigInt(0xff));
        result >>= BigInt(8);
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
        if (!code || !code.startsWith('CSGO-')) throw new Error('Invalid format');
        
        const cleanCode = code.replace(/^CSGO-/, '').replace(/-/g, '');
        const bytes = decodeBase58(cleanCode);

        // Mapeamento baseado em engenharia reversa da comunidade
        const size = bytes[2] / 10;
        const thickness = bytes[4] / 10;
        const gapByte = bytes[3];
        const gap = (gapByte > 127 ? gapByte - 256 : gapByte) / 10;
        
        const dot = (bytes[11] & 1) === 1;
        const outline = (bytes[12] & 1) === 1;
        
        // Cores pré-definidas
        const colorIndex = bytes[5];
        let color = '#00ff00'; // Default Green
        
        switch(colorIndex) {
            case 0: color = '#ff0000'; break; // Red
            case 1: color = '#00ff00'; break; // Green
            case 2: color = '#ffff00'; break; // Yellow
            case 3: color = '#0000ff'; break; // Blue
            case 4: color = '#00ffff'; break; // Cyan
            case 5: // Custom RGB
                const r = bytes[13];
                const g = bytes[14];
                const b = bytes[15];
                color = `rgb(${r}, ${g}, ${b})`;
                break;
        }

        return {
            width: `${Math.max(1, size * 2)}px`,
            height: `${Math.max(1, size * 2)}px`,
            gap: `${gap * 2}px`,
            thickness: `${Math.max(0.5, thickness * 2)}px`,
            dot,
            outline,
            color
        };
    } catch (e) {
        return {
            width: '5px',
            height: '5px',
            gap: '0px',
            thickness: '1px',
            dot: false,
            outline: true,
            color: '#00ff00'
        };
    }
}
