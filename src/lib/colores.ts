// Colores para identificar a cada cuidadora y cada turno: tonos apagados, legibles y sobrios.
export const PALETA = {
  azul: { bg: '#edf3fb', fg: '#1e4e8c', dot: '#7fa6d9' },
  verde: { bg: '#ecf6f1', fg: '#1d6b4a', dot: '#7cc0a0' },
  violeta: { bg: '#f1effa', fg: '#4b3f94', dot: '#a99ee0' },
  ambar: { bg: '#fbf5e9', fg: '#8a5a0b', dot: '#e0b56a' },
  teja: { bg: '#fbf0ec', fg: '#93412a', dot: '#e2a08a' },
  gris: { bg: '#f1f3f5', fg: '#3f4b5a', dot: '#a3adba' },
} as const;

export type ColorKey = keyof typeof PALETA;
export const COLORES = Object.keys(PALETA) as ColorKey[];
