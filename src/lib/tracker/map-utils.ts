export interface MapMetadata {
  name: string;
  pos_x: number;
  pos_y: number;
  scale: number;
  image: string;
}

export const MAPS_META: Record<string, MapMetadata> = {
  de_mirage: {
    name: "Mirage",
    pos_x: -3230,
    pos_y: 1713,
    scale: 5.0,
    image: "/img/maps/Mirage.webp",
  },
  de_dust2: {
    name: "Dust 2",
    pos_x: -2476,
    pos_y: 3239,
    scale: 4.4,
    image: "/img/maps/Dust2.webp",
  },
  de_inferno: {
    name: "Inferno",
    pos_x: -2087,
    pos_y: 3870,
    scale: 4.9,
    image: "/img/maps/Inferno.webp",
  },
  de_overpass: {
    name: "Overpass",
    pos_x: -4831,
    pos_y: 1781,
    scale: 5.2,
    image: "/img/maps/Overpass.webp",
  },
  de_ancient: {
    name: "Ancient",
    pos_x: -2950,
    pos_y: 2150,
    scale: 5.0,
    image: "/img/maps/Ancient.webp",
  },
  de_anubis: {
    name: "Anubis",
    pos_x: -2796,
    pos_y: 3328,
    scale: 5.22,
    image: "/img/maps/Anubis.webp",
  },
  de_nuke: {
    name: "Nuke",
    pos_x: -3453,
    pos_y: 2887,
    scale: 7.0,
    image: "/img/maps/Nuke.webp",
  },
};

/**
 * Safely retrieves map metadata
 */
export function getMapMeta(mapName: string): MapMetadata | undefined {
  const normalized = mapName.toLowerCase().startsWith('de_') ? mapName.toLowerCase() : `de_${mapName.toLowerCase()}`;
  return MAPS_META[normalized];
}

/**
 * Maps game units to pixel coordinates based on radar metadata
 */
export function worldToCanvas(x: number, y: number, meta: MapMetadata, canvasSize: number = 1024) {
  const pixelX = (x - meta.pos_x) / meta.scale;
  const pixelY = (meta.pos_y - y) / meta.scale;
  
  // Rescale to target canvas size (assuming radar images are 1024x1024 base)
  const ratio = canvasSize / 1024;
  
  return {
    x: pixelX * ratio,
    y: pixelY * ratio,
  };
}
