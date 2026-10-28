/** Pequeña vibración al tocar acciones importantes (solo en teléfonos que lo permiten, como Android). */
export const vibrar = (ms = 8) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(ms);
  } catch {
    /* ignorar */
  }
};
