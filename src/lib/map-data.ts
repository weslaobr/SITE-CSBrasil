export interface MapMetadata {
  pos_x: number;
  pos_y: number;
  scale: number;
  image?: string;
}

export const MAP_DATA: Record<string, MapMetadata> = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.0 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.9 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.4 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 7.0 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.2 },
  vertigo: { pos_x: -3120, pos_y: 1720, scale: 4.0 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.0 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22 },
  cache: { pos_x: -2000, pos_y: 3250, scale: 5.5 },
  train: { pos_x: -2477, pos_y: 2392, scale: 4.7 },
};

/**
 * Converte coordenadas do jogo para coordenadas de pixel (0-100%)
 * @param x Coordenada X do jogo
 * @param y Coordenada Y do jogo
 * @param mapName Nome do mapa (ex: de_mirage)
 * @returns { x: number, y: number } em porcentagem
 */
export function worldToMap(x: number, y: number, mapName: string) {
  const name = mapName.toLowerCase().replace('de_', '');
  const meta = MAP_DATA[name] || MAP_DATA.mirage;

  // Fórmula padrão Source Engine:
  // pixel_x = (x - pos_x) / scale
  // pixel_y = (pos_y - y) / scale
  
  // Como o canvas/div usa 1024x1024 como base nos overviews clássicos:
  const px = (x - meta.pos_x) / meta.scale;
  const py = (meta.pos_y - y) / meta.scale;

  // Converter para porcentagem (assumindo que o overview é 1024x1024)
  return {
    x: (px / 1024) * 100,
    y: (py / 1024) * 100
  };
}
