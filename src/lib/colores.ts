export const PALETA = {
  rosa: { bg: '#fde2ea', fg: '#a8355d', dot: '#f4a3bb' },
  lavanda: { bg: '#ebe4fb', fg: '#5b3fa8', dot: '#c3b1f0' },
  menta: { bg: '#dcf3e9', fg: '#22724f', dot: '#99dcc0' },
  durazno: { bg: '#ffe7d6', fg: '#a8501a', dot: '#ffc29b' },
  cielo: { bg: '#dceefc', fg: '#265d8c', dot: '#a5cdf1' },
  limon: { bg: '#fbf3c9', fg: '#7a6410', dot: '#f0dd7c' },
} as const;

export type ColorKey = keyof typeof PALETA;
export const COLORES = Object.keys(PALETA) as ColorKey[];
