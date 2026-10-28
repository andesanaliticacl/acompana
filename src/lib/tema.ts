import { useEffect, useState } from 'react';

/** Preferencia de tema: claro, oscuro o automático (sigue al teléfono / computador). */
export type Tema = 'auto' | 'claro' | 'oscuro';

const CLAVE = 'acompana-tema';
const EVENTO = 'acompana-tema';
const medio = () => window.matchMedia('(prefers-color-scheme: dark)');

export const leerTema = (): Tema => {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : 'auto';
  } catch {
    return 'auto';
  }
};

/** Aplica el tema al <html> y al color de la barra del navegador en el celular. */
function aplicar(oscuro: boolean) {
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0e1014' : '#ffffff');
}

export function useTema() {
  const [tema, setTemaState] = useState<Tema>(leerTema);
  const [sistemaOscuro, setSistemaOscuro] = useState(() => medio().matches);
  const oscuro = tema === 'oscuro' || (tema === 'auto' && sistemaOscuro);

  // Si el tema se cambia en otra parte de la app (menú Más o Ajustes), sincronizar
  useEffect(() => {
    const f = () => setTemaState(leerTema());
    window.addEventListener(EVENTO, f);
    return () => window.removeEventListener(EVENTO, f);
  }, []);

  // Seguir los cambios del sistema (ej. el teléfono pasa a modo noche)
  useEffect(() => {
    const m = medio();
    const f = () => setSistemaOscuro(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);

  useEffect(() => aplicar(oscuro), [oscuro]);

  const setTema = (t: Tema) => {
    setTemaState(t);
    try { localStorage.setItem(CLAVE, t); } catch { /* ignorar */ }
    window.dispatchEvent(new Event(EVENTO));
  };
  return { tema, setTema, oscuro };
}
