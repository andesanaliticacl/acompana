import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react';
import type { Tab } from '../App';
import { Boton, cx } from './ui';

/** Un paso del recorrido: a qué pantalla ir, qué iluminar (atributo data-tour) y qué explicar. */
interface Paso {
  tab?: Tab;
  sel?: string;
  titulo: string;
  texto: string;
}

export const PASOS: Paso[] = [
  {
    tab: 'hoy',
    titulo: 'Bienvenida a Acompaña',
    texto: 'Este recorrido te muestra para qué sirve cada parte de la app. Avanza con "Siguiente" y ciérralo cuando quieras con "Cerrar tutorial".',
  },
  {
    tab: 'hoy', sel: 'hoy-resumen',
    titulo: 'Resumen del día',
    texto: 'Arriba ves cuánto tienes que pagar el domingo y si falta cubrir algún turno en los próximos 7 días.',
  },
  {
    tab: 'hoy', sel: 'hoy-turnos',
    titulo: 'Turnos de hoy',
    texto: 'Cuando llega cada cuidadora, toca "Llegó", "Tarde" o "No vino". Con eso se calcula su puntualidad y lo que se le paga.',
  },
  {
    tab: 'hoy', sel: 'hoy-asignar',
    titulo: 'Asignar un turno',
    texto: 'Desde aquí asignas rápido a una cuidadora: eliges el día, el turno (Día o Noche), el residente y la cuidadora.',
  },
  {
    tab: 'semana', sel: 'cal-dias',
    titulo: 'Calendario: elige el día',
    texto: 'Cada cuadro es un día de la semana. "Completo" en verde significa que todos los residentes tienen cuidadora; en rojo te dice cuántas faltan.',
  },
  {
    tab: 'semana', sel: 'cal-tabla',
    titulo: 'Quién cuida a quién',
    texto: 'Cada fila es un residente y las columnas son el turno Día y Noche. Toca "Asignar" en rojo para poner una cuidadora, o toca un nombre para cambiarla o marcar su asistencia.',
  },
  {
    tab: 'semana', sel: 'cal-buscar',
    titulo: 'Buscar en el día',
    texto: 'Escribe el nombre de un residente, cliente o cuidadora para ver solo esa fila. "Por piso" y "Por cliente" cambian cómo se ordena la tabla.',
  },
  {
    tab: 'semana', sel: 'cal-vistas',
    titulo: 'Semana por cuidadora',
    texto: 'Con este botón ves la semana completa como planilla: una fila por cuidadora, con sus turnos y sus horas.',
  },
  {
    tab: 'cuidadoras', sel: 'cuid-lista',
    titulo: 'Cuidadoras',
    texto: 'La ficha de cada cuidadora: edad, experiencia, cómo es (amable, puntual…), tu valoración con estrellas y su puntualidad real. Tócala para ver sus turnos o editarla.',
  },
  {
    tab: 'clientes', sel: 'cli-lista',
    titulo: 'Clientes y residentes',
    texto: 'El cliente es el apoderado que contrata y paga. En su ficha ves sus residentes, su piso, cuánto paga por semana y si ya pagó.',
  },
  {
    tab: 'pagos', sel: 'pagos-resumen',
    titulo: 'Pagos del domingo',
    texto: 'Cada domingo la app calcula horas × valor hora de cada cuidadora. Puedes agregar un bono o descuento y marcar "pagado".',
  },
  {
    tab: 'caja', sel: 'caja-kpis',
    titulo: 'Caja',
    texto: 'Lo que entra (pagos de clientes) y lo que sale (cuidadoras y gastos). "Te queda" es tu ganancia de la semana o del mes.',
  },
  {
    sel: 'buscar',
    titulo: 'Buscador general',
    texto: 'Busca a cualquier cuidadora, residente o cliente desde cualquier pantalla. En el computador también se abre con Ctrl + K.',
  },
  {
    tab: 'ajustes', sel: 'ajustes-turnos',
    titulo: 'Ajustes',
    texto: 'Aquí cambias los horarios de los turnos (por ejemplo, el domingo desde las 9:00), los pisos y tu nombre.',
  },
  {
    tab: 'hoy',
    titulo: '¡Listo!',
    texto: 'Ya conoces la app. Puedes volver a ver este recorrido cuando quieras con el botón "Tutorial".',
  },
];

/** Busca el elemento visible marcado con data-tour (puede haber uno para celular y otro para computador). */
const buscar = (sel?: string) =>
  sel
    ? ([...document.querySelectorAll(`[data-tour="${sel}"]`)] as HTMLElement[]).find((e) => e.offsetParent !== null || e.getClientRects().length > 0)
    : undefined;

export function Tutorial({ paso, setPaso, ir, onClose }: { paso: number; setPaso: (n: number) => void; ir: (t: Tab) => void; onClose: () => void }) {
  const p = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Ir a la pantalla del paso
  useEffect(() => {
    if (p.tab) ir(p.tab);
  }, [paso]);

  // Seguir al elemento iluminado (la pantalla puede tardar en dibujarse o moverse al hacer scroll)
  useEffect(() => {
    let centrado = false;
    const tick = () => {
      const el = buscar(p.sel);
      if (el && !centrado) {
        const alto = el.getBoundingClientRect().height > window.innerHeight * 0.6;
        el.scrollIntoView({ block: alto ? 'start' : 'center', behavior: 'smooth' });
        centrado = true;
      }
      setRect(el ? el.getBoundingClientRect() : null);
    };
    tick();
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [paso, p.sel]);

  // Teclado: flechas para avanzar/retroceder, Esc para cerrar
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !ultimo) setPaso(paso + 1);
      if (e.key === 'ArrowLeft' && paso > 0) setPaso(paso - 1);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [paso, ultimo, setPaso, onClose]);

  // Tarjeta arriba si lo iluminado está en la mitad de abajo, para no taparlo
  const arriba = !!rect && rect.top + rect.height / 2 > window.innerHeight * 0.55;
  const M = 6;

  return (
    <>
      {/* Oscurecer todo menos lo que se explica (no bloquea los clics) */}
      {rect ? (
        <div
          className="pointer-events-none fixed z-[60] rounded-xl ring-4 ring-primario transition-all duration-200"
          style={{
            top: rect.top - M, left: rect.left - M, width: rect.width + M * 2, height: rect.height + M * 2,
            boxShadow: '0 0 0 9999px rgba(17,24,39,.45)',
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[60] bg-[#111827]/45" />
      )}

      {/* Barra superior con el botón para cerrar */}
      <div className="fixed inset-x-0 top-0 z-[62] flex justify-center p-2">
        <div className="flex items-center gap-3 rounded-full bg-tinta py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg">
          <GraduationCap size={16} />
          <span className="whitespace-nowrap">
            <span className="hidden sm:inline">Modo tutorial · Paso {paso + 1} de {PASOS.length}</span>
            <span className="sm:hidden">Tutorial · {paso + 1}/{PASOS.length}</span>
          </span>
          <button onClick={onClose} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-medium whitespace-nowrap hover:bg-white/25">
            <X size={14} /> Cerrar tutorial
          </button>
        </div>
      </div>

      {/* Tarjeta con la explicación */}
      <div
        className={cx(
          'anim-subir fixed inset-x-3 z-[62] mx-auto max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6',
          arriba ? 'top-16' : 'bottom-24 lg:bottom-6',
        )}
        key={paso}
      >
        <div className="mb-3 flex gap-1">
          {PASOS.map((_, i) => (
            <span key={i} className={cx('h-1 flex-1 rounded-full', i <= paso ? 'bg-primario' : 'bg-linea')} />
          ))}
        </div>
        <h3 className="text-lg font-semibold">{p.titulo}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#4b5563]">{p.texto}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Boton chico variante="fantasma" onClick={() => setPaso(paso - 1)} disabled={paso === 0}>
            <ChevronLeft size={16} /> Anterior
          </Boton>
          {ultimo ? (
            <Boton chico onClick={onClose}>
              Terminar
            </Boton>
          ) : (
            <Boton chico onClick={() => setPaso(paso + 1)}>
              Siguiente <ChevronRight size={16} />
            </Boton>
          )}
        </div>
      </div>
    </>
  );
}
