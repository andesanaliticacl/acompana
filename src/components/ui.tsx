import { useEffect, useRef, useState, type ButtonHTMLAttributes, type PointerEvent as PE, type ReactNode } from 'react';
import { Clock, HeartHandshake, Minus, Moon, MoreHorizontal, Plus, Star, Sun, Sunset, X } from 'lucide-react';
import { PALETA, type ColorKey } from '../lib/colores';
import { ESTADOS, tonoRasgo, type Cuidadora, type Estado, type IconoTurno } from '../lib/types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ className, children, onClick, tour }: { className?: string; children: ReactNode; onClick?: () => void; tour?: string }) {
  return (
    <div
      onClick={onClick}
      data-tour={tour}
      className={cx(
        'rounded-xl border border-linea bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]',
        onClick && 'cursor-pointer transition active:scale-[.99] hover:border-primario-200 hover:shadow-md',
        className,
      )}
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
        'inline-flex touch-manipulation select-none items-center justify-center gap-2 rounded-lg font-semibold transition duration-150 active:scale-[.96] disabled:opacity-40 disabled:active:scale-100',
        chico ? 'min-h-10 px-3.5 py-1.5 text-sm sm:min-h-0' : 'min-h-11 px-4 py-2.5',
        variante === 'principal' && 'bg-primario text-sobre shadow-sm hover:bg-primario-600',
        variante === 'suave' && 'border border-linea bg-superficie text-tinta shadow-sm hover:bg-fondo',
        variante === 'fantasma' && 'text-suave hover:bg-fondo hover:text-tinta',
        variante === 'peligro' && 'text-alerta hover:bg-alerta-50',
        className,
      )}
    />
  );
}

/**
 * Ventana. En el celular es una hoja que sube desde abajo y se cierra deslizándola hacia abajo
 * (desde la barrita o el título). En el computador aparece al centro. Siempre se cierra con animación.
 */
export function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }: { titulo: ReactNode; onClose: () => void; children: ReactNode; ancho?: string }) {
  const [saliendo, setSaliendo] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<number | null>(null);

  const cerrar = () => {
    if (saliendo) return;
    setSaliendo(true);
    window.setTimeout(onClose, 220);
  };

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', f);
      document.body.style.overflow = '';
    };
  }, []);

  // Deslizar hacia abajo para cerrar (solo celular)
  const empezar = (e: PE) => {
    if (window.innerWidth >= 640 || (e.target as HTMLElement).closest('button')) return;
    inicio.current = e.clientY;
    setArrastrando(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const mover = (e: PE) => {
    if (inicio.current === null) return;
    setArrastre(Math.max(0, e.clientY - inicio.current));
  };
  const soltar = () => {
    if (inicio.current === null) return;
    inicio.current = null;
    setArrastrando(false);
    if (arrastre > 90) cerrar();
    else setArrastre(0);
  };

  return (
    <div
      className={cx('fixed inset-0 z-50 flex items-end justify-center bg-velo/50 sm:items-center sm:p-4', saliendo ? 'anim-desaparecer' : 'anim-aparecer')}
      onClick={cerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-superficie pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-2xl sm:pb-0',
          saliendo ? 'hoja-sale' : 'hoja-entra',
          ancho,
        )}
        style={{ translate: `0 ${arrastre}px`, transition: arrastrando ? 'none' : 'translate .25s var(--ease-hoja)' }}
      >
        <div className="shrink-0 touch-none select-none" onPointerDown={empezar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-borde" />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-linea px-5 pt-2 pb-3 sm:py-3.5">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button onClick={cerrar} className="rounded-full p-2 text-suave transition hover:bg-hover active:scale-90" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-6">{children}</div>
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
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ width: size, height: size, background: col.bg, color: col.fg, fontSize: size * 0.36, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${col.dot} 45%, transparent)` }}
    >
      {iniciales(c.nombre)}
    </div>
  );
}

const ICONOS_TURNO = { manana: Sun, tarde: Sunset, noche: Moon, reloj: Clock } as const;
export const OPCIONES_ICONO: { id: IconoTurno; label: string }[] = [
  { id: 'manana', label: 'Sol' },
  { id: 'tarde', label: 'Atardecer' },
  { id: 'noche', label: 'Luna' },
  { id: 'reloj', label: 'Reloj' },
];
export function TurnoIcono({ icono, size = 16, className }: { icono: IconoTurno; size?: number; className?: string }) {
  const I = ICONOS_TURNO[icono] ?? Clock;
  return <I size={size} className={cx('shrink-0', className)} />;
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
          <Star size={size} className={i <= valor ? 'fill-estrella text-estrella' : 'text-apagado'} />
        </button>
      ))}
    </div>
  );
}

export function Rasgo({ nombre, activo = true, onClick }: { nombre: string; activo?: boolean; onClick?: () => void }) {
  const tono = tonoRasgo(nombre);
  const col =
    tono === 'bueno' ? { bg: 'var(--r-bueno-bg)', fg: 'var(--r-bueno-fg)', bd: 'var(--r-bueno-bd)' }
    : tono === 'ojo' ? { bg: 'var(--r-ojo-bg)', fg: 'var(--r-ojo-fg)', bd: 'var(--r-ojo-bd)' }
    : { bg: 'var(--r-neutro-bg)', fg: 'var(--r-neutro-fg)', bd: 'var(--r-neutro-bd)' };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx('rounded-md border px-2 py-0.5 text-xs font-medium transition', onClick && 'cursor-pointer')}
      style={activo ? { background: col.bg, color: col.fg, borderColor: col.bd } : { background: 'var(--c-superficie)', color: 'var(--c-suave)', borderColor: 'var(--c-linea)' }}
    >
      {nombre}
    </button>
  );
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return (
    <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: e.bg, color: e.fg }}>
      {e.label}
    </span>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-tinta">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-suave">{ayuda}</span>}
    </label>
  );
}
export const inputCls =
  'w-full rounded-lg border border-borde bg-superficie px-3.5 py-2.5 text-base shadow-sm outline-none transition focus:border-primario focus:ring-3 focus:ring-primario/15';

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
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
              on ? 'border-primario ring-2 ring-primario/15' : 'border-borde bg-superficie text-suave hover:bg-fondo',
            )}
            style={on ? { background: o.bg ?? 'var(--c-primario-50)', color: o.fg ?? 'var(--c-primario)', borderColor: o.fg ?? undefined } : undefined}
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
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primario text-sobre">
        <HeartHandshake size={20} />
      </div>
      {!compacto && (
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-tight">Acompaña</div>
          <div className="text-xs text-suave">Gestión de cuidadoras</div>
        </div>
      )}
    </div>
  );
}

/** Encabezado de pantalla: el nombre lo muestran las pestañas de arriba; aquí va un subtítulo corto y la acción principal. */
export function Titulo({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  if (!sub && !children) return <h1 className="sr-only">{titulo}</h1>;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="sr-only">{titulo}</h1>
      {sub ? <p className="text-sm text-suave">{sub}</p> : <span />}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export interface OpcionMas {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  activo?: boolean;
}

/** Botón "⋯ Más" que despliega acciones secundarias, para dejar a la vista solo lo importante. */
export function MenuMas({ items, label = 'Más', alinear = 'derecha', haciaArriba }: { items: OpcionMas[]; label?: string; alinear?: 'derecha' | 'izquierda'; haciaArriba?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAbierto(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', cerrar);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      window.removeEventListener('keydown', esc);
    };
  }, [abierto]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((x) => !x)}
        className={cx('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition', abierto ? 'border-primario bg-primario-50 text-primario' : 'border-linea bg-superficie text-suave hover:bg-fondo')}
        aria-expanded={abierto}
      >
        <MoreHorizontal size={16} /> {label}
      </button>
      {abierto && (
        <div className={cx('anim-menu absolute z-40 min-w-56 overflow-hidden rounded-xl border border-linea bg-superficie py-1 shadow-xl', alinear === 'derecha' ? 'right-0' : 'left-0', haciaArriba ? 'bottom-full mb-1.5 origin-bottom-left' : 'mt-1.5', !haciaArriba && (alinear === 'derecha' ? 'origin-top-right' : 'origin-top-left'))}>
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => { setAbierto(false); it.onClick(); }}
              className={cx('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-fondo', it.activo && 'font-medium text-primario')}
            >
              <span className="text-suave">{it.icon}</span> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ColorDot({ color, size = 10 }: { color: ColorKey; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: PALETA[color].dot }} />;
}

export function Contador({ valor, min, onChange }: { valor: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-borde bg-superficie shadow-sm">
      <button className="px-3 py-2.5 hover:bg-fondo disabled:opacity-30" disabled={valor <= min} onClick={() => onChange(Math.max(min, valor - 1))} aria-label="Menos">
        <Minus size={15} />
      </button>
      <span className="w-9 text-center font-semibold tabular-nums">{valor}</span>
      <button className="px-3 py-2.5 hover:bg-fondo" onClick={() => onChange(valor + 1)} aria-label="Más">
        <Plus size={15} />
      </button>
    </div>
  );
}
