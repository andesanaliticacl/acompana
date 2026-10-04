import { useEffect, useState } from 'react';
import { CalendarDays, PiggyBank, Settings, Sun, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Hoy } from './screens/Hoy';
import { Semana } from './screens/Semana';
import { Cuidadoras } from './screens/Cuidadoras';
import { Pagos } from './screens/Pagos';
import { Caja } from './screens/Caja';
import { Ajustes } from './screens/Ajustes';
import { Logo, cx } from './components/ui';

export type Tab = 'hoy' | 'semana' | 'cuidadoras' | 'pagos' | 'caja' | 'ajustes';

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun },
  { id: 'semana', label: 'Calendario', icon: CalendarDays },
  { id: 'cuidadoras', label: 'Cuidadoras', icon: Users },
  { id: 'pagos', label: 'Pagos', icon: Wallet },
  { id: 'caja', label: 'Caja', icon: PiggyBank },
];

const leerTab = (): Tab => {
  const h = window.location.hash.slice(1) as Tab;
  return [...NAV.map((n) => n.id), 'ajustes'].includes(h) ? h : 'hoy';
};

export default function App() {
  const [tab, setTab] = useState<Tab>(leerTab);

  useEffect(() => {
    const f = () => setTab(leerTab());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const ir = (t: Tab) => {
    window.location.hash = t;
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-linea bg-white lg:flex">
        <div className="p-5">
          <Logo />
        </div>
        <div className="tigre mx-5 h-2 rounded-full" />
        <nav className="mt-5 flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <ItemNav key={n.id} {...n} activo={tab === n.id} onClick={() => ir(n.id)} />
          ))}
        </nav>
        <div className="p-3">
          <ItemNav id="ajustes" label="Ajustes" icon={Settings} activo={tab === 'ajustes'} onClick={() => ir('ajustes')} />
        </div>
        <div className="dalmata h-20 opacity-90" style={{ maskImage: 'linear-gradient(to top, black, transparent)', WebkitMaskImage: 'linear-gradient(to top, black, transparent)' }} />
      </aside>

      {/* Encabezado (celular) */}
      <header className="sticky top-0 z-30 border-b border-linea bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Logo />
          <button onClick={() => ir('ajustes')} className={cx('rounded-full p-2.5', tab === 'ajustes' ? 'bg-rosa text-rosa-fg' : 'text-suave')} aria-label="Ajustes">
            <Settings size={22} />
          </button>
        </div>
        <div className="tigre h-1.5" />
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {tab === 'hoy' && <Hoy ir={ir} />}
          {tab === 'semana' && <Semana />}
          {tab === 'cuidadoras' && <Cuidadoras />}
          {tab === 'pagos' && <Pagos />}
          {tab === 'caja' && <Caja />}
          {tab === 'ajustes' && <Ajustes />}
        </div>
      </main>

      {/* Navegación inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => ir(id)} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold', tab === id ? 'text-rosa-fg' : 'text-suave')}>
              <span className={cx('rounded-full px-4 py-1 transition', tab === id && 'bg-rosa')}>
                <Icon size={22} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ItemNav({ label, icon: Icon, activo, onClick }: { id: Tab; label: string; icon: LucideIcon; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition', activo ? 'bg-rosa text-rosa-fg' : 'text-suave hover:bg-[#fbf5f7]')}
    >
      <Icon size={20} /> {label}
    </button>
  );
}
