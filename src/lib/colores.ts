// Colores para identificar a cada cuidadora y cada turno. Son variables CSS (ver index.css),
// así se adaptan solos al modo claro u oscuro.
const color = (k: string) => ({ bg: `var(--p-${k}-bg)`, fg: `var(--p-${k}-fg)`, dot: `var(--p-${k}-dot)` });

export const PALETA = {
  azul: color('azul'),
  verde: color('verde'),
  violeta: color('violeta'),
  ambar: color('ambar'),
  teja: color('teja'),
  gris: color('gris'),
} as const;

export type ColorKey = keyof typeof PALETA;
export const COLORES = Object.keys(PALETA) as ColorKey[];
