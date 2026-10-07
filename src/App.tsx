import { useEffect, useState } from 'react';
import { CalendarDays, HeartPulse, PiggyBank, Settings, Sun, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Hoy } from './screens/Hoy';
import { Semana } from './screens/Semana';
import { Cuidadoras } from './screens/Cuidadoras';
import { Clientes } from './screens/Clientes';
import { Pagos } from './screens/Pagos';
import { Caja } from './screens/Caja';
import { Ajustes } from './screens/Ajustes';
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
        <div className="border-b border-linea px-5 py-4">
          <Logo />
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
        <div className="flex items-center justify-between px-4 py-2.5">
          <Logo />
          <button onClick={() => ir('ajustes')} className={cx('rounded-lg p-2.5', tab === 'ajustes' ? 'bg-primario-50 text-primario' : 'text-suave')} aria-label="Ajustes">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {tab === 'hoy' && <Hoy ir={ir} />}
          {tab === 'semana' && <Semana />}
          {tab === 'cuidadoras' && <Cuidadoras />}
          {tab === 'clientes' && <Clientes />}
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
