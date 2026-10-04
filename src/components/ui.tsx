import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Star, X } from 'lucide-react';
import { PALETA, type ColorKey } from '../lib/colores';
import { ESTADOS, tonoRasgo, type Cuidadora, type Estado } from '../lib/types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-3xl border border-linea bg-white p-4 shadow-[0_2px_0_#f1e6ea]', onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md', className)}
    >
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'suave' | 'fantasma' | 'peligro'; chico?: boolean };
export function Boton({ variante = 'principal', chico, className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[.97] disabled:opacity-40',
        chico ? 'px-3 py-1.5 text-sm' : 'px-5 py-3',
        variante === 'principal' && 'bg-tinta text-white hover:bg-[#4d3f51]',
        variante === 'suave' && 'bg-rosa text-rosa-fg hover:bg-[#fbd2de]',
        variante === 'fantasma' && 'text-suave hover:bg-[#f6eff2]',
        variante === 'peligro' && 'text-rosa-fg hover:bg-rosa',
        className,
      )}
    />
  );
}

export function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }: { titulo: ReactNode; onClose: () => void; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', f);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3a2f3d]/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx('anim-subir flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-crema shadow-2xl sm:rounded-[2rem]', ancho)}
      >
        <div className="tigre h-2.5 shrink-0" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-suave hover:bg-rosa" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export const iniciales = (n: string) =>
  n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const primerNombre = (n: string) => {
  const p = n.split(' ');
  // nombres compuestos típicos: "María José", "Carmen Gloria", "Rosa Elena"
  return p.length >= 3 ? `${p[0]} ${p[1]}` : p[0];
};

export function Avatar({ c, size = 44 }: { c: Pick<Cuidadora, 'nombre' | 'color'>; size?: number }) {
  const col = PALETA[c.color];
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full font-display font-semibold"
      style={{ width: size, height: size, background: col.bg, color: col.fg, fontSize: size * 0.36, boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${col.dot}` }}
    >
      {iniciales(c.nombre)}
    </div>
  );
}

export function Estrellas({ valor, onChange, size = 18 }: { valor: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={cx(onChange && 'cursor-pointer p-0.5 transition hover:scale-110')}
        >
          <Star size={size} className={i <= valor ? 'fill-[#f6b73c] text-[#f6b73c]' : 'text-[#e3d6db]'} />
        </button>
      ))}
    </div>
  );
}

export function Rasgo({ nombre, activo = true, onClick }: { nombre: string; activo?: boolean; onClick?: () => void }) {
  const tono = tonoRasgo(nombre);
  const col = tono === 'bueno' ? PALETA.menta : tono === 'ojo' ? PALETA.durazno : PALETA.lavanda;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx('rounded-full px-2.5 py-1 text-xs font-bold transition', onClick && 'cursor-pointer', !activo && 'opacity-50 grayscale')}
      style={activo ? { background: col.bg, color: col.fg } : { background: '#f6f1f3', color: '#7b6e80' }}
    >
      {tono === 'ojo' && activo ? '⚠ ' : ''}
      {nombre}
    </button>
  );
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: e.bg, color: e.fg }}>
      {e.label}
    </span>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-suave">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-suave">{ayuda}</span>}
    </label>
  );
}
export const inputCls =
  'w-full rounded-2xl border-2 border-linea bg-white px-4 py-2.5 text-base outline-none transition focus:border-rosa-2';

export function Segmentado<T extends string>({ opciones, valor, onChange }: { opciones: { id: T; label: ReactNode; bg?: string; fg?: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const on = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cx('rounded-full border-2 px-3.5 py-2 text-sm font-bold transition', on ? 'border-tinta' : 'border-linea bg-white text-suave hover:border-rosa-2')}
            style={on ? { background: o.bg ?? '#3a2f3d', color: o.fg ?? '#fff' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Logo({ compacto }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="size-10 shrink-0 drop-shadow-sm" aria-hidden>
        <circle cx="20" cy="20" r="18" fill="#fff" stroke="#f4a3bb" strokeWidth="3" />
        <g fill="#3a2f3d">
          <ellipse cx="13" cy="13" rx="4.5" ry="3" transform="rotate(-25 13 13)" />
          <ellipse cx="25" cy="11" rx="2.2" ry="1.8" />
          <ellipse cx="27" cy="23" rx="3.5" ry="4.5" transform="rotate(25 27 23)" />
          <ellipse cx="13" cy="26" rx="3" ry="2.4" />
          <ellipse cx="19" cy="19" rx="1.4" ry="1.2" />
        </g>
      </svg>
      {!compacto && (
        <div className="leading-none">
          <div className="font-display text-2xl font-semibold tracking-tight">
            Pintitas<span className="text-rosa-2">.</span>
          </div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-suave">turnos · pagos · caja</div>
        </div>
      )}
    </div>
  );
}

export function Titulo({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
        {sub && <p className="mt-1 text-suave">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function ColorDot({ color, size = 10 }: { color: ColorKey; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: PALETA[color].dot }} />;
}
