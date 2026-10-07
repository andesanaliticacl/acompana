import { useEffect, useState } from 'react';
import { CalendarDays, HeartPulse, PiggyBank, Search, Settings, Sun, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Hoy } from './screens/Hoy';
import { Semana } from './screens/Semana';
import { Cuidadoras } from './screens/Cuidadoras';
import { Clientes } from './screens/Clientes';
import { Pagos } from './screens/Pagos';
import { Caja } from './screens/Caja';
import { Ajustes } from './screens/Ajustes';
import { Buscador } from './components/Buscador';
import { Logo, cx } from './components/ui';

export type Tab = 'hoy' | 'semana' | 'cuidadoras' | 'clientes' | 'pagos' | 'caja' | 'ajustes';

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun },
  { id: 'semana', label: 'Calendario', icon: CalendarDays },
  { id: 'cuidadoras', label: 'Cuidadoras', icon: Users },
  { id: 'clientes', label: 'Clientes', icon: HeartPulse },
  { id: 'pagos', label: 'Pagos', icon: Wallet },
  { id: 'caja', label: 'Caja', icon: PiggyBank },
];

/** Ruta en el hash: "#tab" o "#tab:parámetro" (ej. #cuidadoras:c3, #semana:Inés). */
const leerRuta = (): { tab: Tab; param?: string } => {
  const [t, ...resto] = window.location.hash.slice(1).split(':');
  const tab = ([...NAV.map((n) => n.id), 'ajustes'] as string[]).includes(t) ? (t as Tab) : 'hoy';
  const param = resto.length ? decodeURIComponent(resto.join(':')) : undefined;
  return { tab, param };
};

export default function App() {
  const [ruta, setRuta] = useState(leerRuta);
  const [buscar, setBuscar] = useState(false);
  const { tab, param } = ruta;

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

  // La clave fuerza a la pantalla a reiniciarse cuando cambia el parámetro
  const k = `${tab}:${param ?? ''}`;

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-linea bg-white lg:flex">
        <div className="border-b border-linea px-5 py-4">
          <Logo />
        </div>
        <div className="px-3 pt-3">
          <button
            onClick={() => setBuscar(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-left text-sm text-suave shadow-sm hover:bg-fondo"
          >
            <Search size={16} /> <span className="flex-1">Buscar…</span>
            <kbd className="rounded border border-linea bg-fondo px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map((n) => (
            <ItemNav key={n.id} {...n} activo={tab === n.id} onClick={() => ir(n.id)} />
          ))}
        </nav>
        <div className="border-t border-linea p-3">
          <ItemNav id="ajustes" label="Ajustes" icon={Settings} activo={tab === 'ajustes'} onClick={() => ir('ajustes')} />
        </div>
      </aside>

      {/* Encabezado (celular) */}
      <header className="sticky top-0 z-30 border-b border-linea bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <Logo />
          <div className="flex gap-1">
            <button onClick={() => setBuscar(true)} className="rounded-lg p-2.5 text-suave" aria-label="Buscar">
              <Search size={22} />
            </button>
            <button onClick={() => ir('ajustes')} className={cx('rounded-lg p-2.5', tab === 'ajustes' ? 'bg-primario-50 text-primario' : 'text-suave')} aria-label="Ajustes">
              <Settings size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {tab === 'hoy' && <Hoy ir={ir} />}
          {tab === 'semana' && <Semana key={k} param={param} />}
          {tab === 'cuidadoras' && <Cuidadoras key={k} param={param} />}
          {tab === 'clientes' && <Clientes key={k} param={param} />}
          {tab === 'pagos' && <Pagos />}
          {tab === 'caja' && <Caja />}
          {tab === 'ajustes' && <Ajustes />}
        </div>
      </main>

      {/* Navegación inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-6">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => ir(id)} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium', tab === id ? 'text-primario' : 'text-suave')}>
              <span className={cx('rounded-lg px-3 py-1 transition', tab === id && 'bg-primario-50')}>
                <Icon size={21} strokeWidth={1.9} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {buscar && <Buscador onClose={() => setBuscar(false)} ir={(t, p) => { setBuscar(false); ir(t, p); }} />}
    </div>
  );
}

function ItemNav({ label, icon: Icon, activo, onClick }: { id: Tab; label: string; icon: LucideIcon; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition', activo ? 'bg-primario-50 text-primario' : 'text-[#4b5563] hover:bg-fondo hover:text-tinta')}
    >
      <Icon size={19} strokeWidth={1.9} /> {label}
    </button>
  );
}
