export interface Utility {
  id: string;
  map: string;
  type: 'smoke' | 'flash' | 'he' | 'molotov';
  side: 'T' | 'CT';
  title: string;
  /** O nome curto e prático do lineup, ex: "Cabecinha", "Janelão" */
  shortName: string;
  /** De onde jogar (ex: "da T Ramp", "do T Spawn") */
  from: string;
  /** Onde a granada cai (ex: "CT Spawn", "Jungle") */
  to: string;
  videoId: string;
  /** Tempo inicial em segundos para vídeos longos (opcional) */
  startTime?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const MAPS = ['Mirage', 'Inferno', 'Dust2', 'Nuke', 'Ancient', 'Anubis', 'Overpass', 'Vertigo'] as const;
export type MapName = typeof MAPS[number];

export const UTILITIES: Utility[] = [
  // ═══════════════════════════════════════════════════════
  //  MIRAGE
  // ═══════════════════════════════════════════════════════
  {
    id: 'mir-1', map: 'Mirage', type: 'smoke', side: 'T',
    title: 'Smoke Janelão do T Spawn',
    shortName: 'Janelão',
    from: 'T Spawn (lixeira)',
    to: 'Window (Sniper)',
    videoId: 'AtPDL4hlADI', difficulty: 'Easy',
  },
  {
    id: 'mir-2', map: 'Mirage', type: 'smoke', side: 'T',
    title: 'Smoke Janelão (W Jump Throw)',
    shortName: 'Janelão v2',
    from: 'T Spawn (lixeira)',
    to: 'Window',
    videoId: '238d2fTt0KY', difficulty: 'Easy',
  },
  {
    id: 'mir-3', map: 'Mirage', type: 'smoke', side: 'T',
    title: 'Smoke Cabecinha da T Ramp',
    shortName: 'Cabecinha',
    from: 'T Ramp (parede)',
    to: 'Stairs (escada)',
    videoId: '7mECGs1tYds', difficulty: 'Easy',
  },
  {
    id: 'mir-4', map: 'Mirage', type: 'smoke', side: 'T',
    title: 'Smoke CT + Jungle Rápido',
    shortName: 'CT + Jungle',
    from: 'T Ramp (porta)',
    to: 'CT Spawn + Jungle',
    videoId: 'qLiN37rxKL4', difficulty: 'Medium',
  },

  // ═══════════════════════════════════════════════════════
  //  INFERNO
  // ═══════════════════════════════════════════════════════
  {
    id: 'inf-1', map: 'Inferno', type: 'smoke', side: 'CT',
    title: 'One-Way Banana',
    shortName: 'One-Way Banana',
    from: 'CT (perto do muro)',
    to: 'Banana (meio)',
    videoId: 'DSK8sZqEHYk', difficulty: 'Easy',
  },
  {
    id: 'inf-6', map: 'Inferno', type: 'molotov', side: 'T',
    title: 'Molly Sacada do Apartamento',
    shortName: 'Sacada',
    from: 'Apartamentos',
    to: 'Balcony (A)',
    videoId: 'MsuAidCsg5w', difficulty: 'Medium',
  },

  // ═══════════════════════════════════════════════════════
  //  DUST2
  // ═══════════════════════════════════════════════════════
  {
    id: 'd2-1', map: 'Dust2', type: 'smoke', side: 'T',
    title: 'Smoke Porta do Meio',
    shortName: 'Porta Meio',
    from: 'T Spawn (grade)',
    to: 'Mid Doors',
    videoId: 'wUIwgfpHGyw', difficulty: 'Easy',
  },
  {
    id: 'd2-2', map: 'Dust2', type: 'smoke', side: 'T',
    title: 'Smoke CT do Meio',
    shortName: 'CT',
    from: 'Mid (Xbox)',
    to: 'CT Spawn',
    videoId: '1cFKIBeQeT4', difficulty: 'Easy',
  },
  {
    id: 'd2-3', map: 'Dust2', type: 'smoke', side: 'T',
    title: 'Smoke CT do Short (Falcons)',
    shortName: 'CT Short',
    from: 'Short (parede)',
    to: 'CT Spawn',
    videoId: 'WjqUrDjsp2k', difficulty: 'Easy',
  },
  {
    id: 'd2-5', map: 'Dust2', type: 'smoke', side: 'T',
    title: 'Smoke Porta B do T Spawn',
    shortName: 'Porta B',
    from: 'T Spawn',
    to: 'B Doors',
    videoId: 'oVe9xgcqP_U', difficulty: 'Medium',
  },
  {
    id: 'd2-6', map: 'Dust2', type: 'smoke', side: 'T',
    title: 'Smoke Janela B do T Spawn',
    shortName: 'Janela B',
    from: 'T Spawn',
    to: 'B Window',
    videoId: 'oVe9xgcqP_U', difficulty: 'Medium',
  },

  // ═══════════════════════════════════════════════════════
  //  ANUBIS
  // ═══════════════════════════════════════════════════════
  {
    id: 'anb-1', map: 'Anubis', type: 'smoke', side: 'T',
    title: 'Smoke Heaven + Site Combo',
    shortName: 'Heaven + Site',
    from: 'T Spawn (canto)',
    to: 'Heaven + B Site',
    videoId: 'GnpIAJA25tc', difficulty: 'Easy',
  },
];
