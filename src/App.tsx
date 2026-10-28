import { useEffect, useState } from 'react';
import { CalendarClock, GraduationCap, Moon, Search, Settings, Sun, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Hoy } from './screens/Hoy';
import { Semana } from './screens/Semana';
import { Cuidadoras } from './screens/Cuidadoras';
import { Clientes } from './screens/Clientes';
import { Pagos } from './screens/Pagos';
import { Caja } from './screens/Caja';
import { Ajustes } from './screens/Ajustes';
import { Buscador } from './components/Buscador';
import { Tutorial } from './components/Tutorial';
import { Logo, MenuMas, cx } from './components/ui';
import { useTema } from './lib/tema';
import { vibrar } from './lib/tacto';

export type Tab = 'hoy' | 'semana' | 'cuidadoras' | 'clientes' | 'pagos' | 'caja' | 'ajustes';

/** Regla de 3: tres secciones, cada una con sus pestañas adentro. */
const SECCIONES: { id: string; label: string; icon: LucideIcon; tabs: { id: Tab; label: string }[] }[] = [
  { id: 'turnos', label: 'Turnos', icon: CalendarClock, tabs: [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Calendario' }] },
  { id: 'personas', label: 'Personas', icon: Users, tabs: [{ id: 'cuidadoras', label: 'Cuidadoras' }, { id: 'clientes', label: 'Clientes' }] },
  { id: 'dinero', label: 'Dinero', icon: Wallet, tabs: [{ id: 'pagos', label: 'Pagos' }, { id: 'caja', label: 'Caja' }] },
];
const TABS: Tab[] = [...SECCIONES.flatMap((s) => s.tabs.map((t) => t.id)), 'ajustes'];

/** Ruta en el hash: "#tab" o "#tab:parámetro" (ej. #cuidadoras:c3, #semana:Inés). */
const leerRuta = (): { tab: Tab; param?: string } => {
  const [t, ...resto] = window.location.hash.slice(1).split(':');
  const tab = (TABS as string[]).includes(t) ? (t as Tab) : 'hoy';
  const param = resto.length ? decodeURIComponent(resto.join(':')) : undefined;
  return { tab, param };
};

export default function App() {
  const [ruta, setRuta] = useState(leerRuta);
  const [buscar, setBuscar] = useState(false);
  const [tour, setTour] = useState<number | null>(null);
  const { tab, param } = ruta;
  const { oscuro, setTema } = useTema();
  const seccion = SECCIONES.find((s) => s.tabs.some((t) => t.id === tab));

  const iniciarTutorial = () => {
    try { localStorage.setItem('acompana-vista', 'dia'); } catch { /* ignorar */ }
    setBuscar(false);
    setTour(0);
  };

  useEffect(() => {
    const f = () => setRuta(leerRuta());
    const atajo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscar(true);
      }
    };
    window.addEventListener('hashchange', f);
    window.addEventListener('keydown', atajo);
    return () => {
      window.removeEventListener('hashchange', f);
      window.removeEventListener('keydown', atajo);
    };
  }, []);

  const ir = (t: Tab, p?: string) => {
    window.location.hash = p ? `${t}:${encodeURIComponent(p)}` : t;
    window.scrollTo({ top: 0 });
  };

  const opcionesMas = [
    { label: 'Tutorial', icon: <GraduationCap size={16} />, onClick: iniciarTutorial, activo: tour !== null },
    { label: oscuro ? 'Modo claro' : 'Modo oscuro', icon: oscuro ? <Sun size={16} /> : <Moon size={16} />, onClick: () => setTema(oscuro ? 'claro' : 'oscuro') },
    { label: 'Ajustes', icon: <Settings size={16} />, onClick: () => ir('ajustes'), activo: tab === 'ajustes' },
  ];

  // La clave fuerza a la pantalla a reiniciarse cuando cambia el parámetro
  const k = `${tab}:${param ?? ''}`;

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra lateral (computador): 3 secciones */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-linea bg-superficie lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              onClick={() => ir(s.tabs[0].id)}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left font-medium transition',
                seccion?.id === s.id ? 'bg-primario-50 text-primario' : 'text-tinta-2 hover:bg-fondo hover:text-tinta',
              )}
            >
              <s.icon size={20} strokeWidth={1.9} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <button
            data-tour="buscar"
            onClick={() => setBuscar(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-linea px-3 py-2 text-left text-sm text-suave hover:bg-fondo"
          >
            <Search size={16} /> <span className="flex-1">Buscar</span>
            <kbd className="rounded border border-linea bg-fondo px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <MenuMas items={opcionesMas} alinear="izquierda" haciaArriba />
        </div>
      </aside>

      {/* Encabezado (celular): logo, buscar y Más */}
      <header className="sticky top-0 z-30 border-b border-linea bg-superficie/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <Logo />
          <div className="flex items-center gap-1.5">
            <button data-tour="buscar" onClick={() => setBuscar(true)} className="rounded-lg p-2.5 text-suave" aria-label="Buscar">
              <Search size={22} />
            </button>
            <MenuMas items={opcionesMas} label="" />
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Pestañas de la sección (2 por sección) con indicador que se desliza */}
          {seccion ? (
            <div className="relative mb-5 grid rounded-xl bg-segmento p-1 sm:max-w-sm" style={{ gridTemplateColumns: `repeat(${seccion.tabs.length}, minmax(0, 1fr))` }}>
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 rounded-lg bg-superficie shadow-sm transition-transform duration-300"
                style={{
                  width: `calc((100% - 0.5rem) / ${seccion.tabs.length})`,
                  transform: `translateX(${Math.max(0, seccion.tabs.findIndex((t) => t.id === tab)) * 100}%)`,
                  transitionTimingFunction: 'var(--ease-app)',
                }}
              />
              {seccion.tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => ir(t.id)}
                  className={cx('relative z-10 rounded-lg py-2 text-[15px] font-medium transition-colors duration-200', tab === t.id ? 'text-tinta' : 'text-suave hover:text-tinta')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <h1 className="mb-5 text-2xl font-semibold tracking-tight">Ajustes</h1>
          )}

          {/* Cada cambio de pantalla entra con una transición suave */}
          <div key={tab} className="anim-entrar">
            {tab === 'hoy' && <Hoy ir={ir} />}
            {tab === 'semana' && <Semana key={k} param={param} />}
            {tab === 'cuidadoras' && <Cuidadoras key={k} param={param} />}
            {tab === 'clientes' && <Clientes key={k} param={param} />}
            {tab === 'pagos' && <Pagos />}
            {tab === 'caja' && <Caja />}
            {tab === 'ajustes' && <Ajustes />}
          </div>
        </div>
      </main>

      {/* Navegación inferior (celular): 3 secciones grandes */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-3">
          {SECCIONES.map((s) => {
            const on = seccion?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { vibrar(); ir(s.tabs[0].id); }}
                className={cx('flex touch-manipulation flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors', on ? 'text-primario' : 'text-suave')}
              >
                <span key={on ? 'on' : 'off'} className={cx('rounded-full px-5 py-1 transition-colors duration-200', on && 'anim-pop bg-primario-50')}>
                  <s.icon size={22} strokeWidth={on ? 2.2 : 1.9} />
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </nav>

      {tour !== null && <Tutorial paso={tour} setPaso={setTour} ir={ir} onClose={() => setTour(null)} />}
      {buscar && <Buscador onClose={() => setBuscar(false)} ir={(t, p) => { setBuscar(false); ir(t, p); }} />}
    </div>
  );
}
