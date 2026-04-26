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
        result = result * BigInt(58) + BigInt(ALPHABET_MAP[char]);
    }
    
    let hex = result.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
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
        // Limpa o código
        const cleanCode = code.replace(/^CSGO-/, '').replace(/-/g, '');
        const bytes = decodeBase58(cleanCode);

        // Mapeamento aproximado (heurística baseada na estrutura da Valve)
        // Nota: A estrutura real é complexa, usamos uma aproximação visual para o preview
        const thickness = (bytes[4] || 10) / 10;
        const size = (bytes[2] || 20) / 10;
        const gap = (bytes[3] > 128 ? (bytes[3] - 256) : bytes[3]) / 10;
        
        // Cores (RGB)
        const r = bytes[bytes.length - 4] || 0;
        const g = bytes[bytes.length - 3] || 255;
        const b = bytes[bytes.length - 2] || 0;

        return {
            width: `${Math.max(1, size)}px`,
            height: `${Math.max(1, size)}px`, // No CSS de preview usamos width como comprimento do braço
            gap: `${gap}px`,
            thickness: `${Math.max(0.5, thickness)}px`,
            dot: bytes[11] > 0,
            outline: bytes[12] > 0,
            color: `rgb(${r}, ${g}, ${b})`
        };
    } catch (e) {
        // Fallback para mira padrão verde caso falhe
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
