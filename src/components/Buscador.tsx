import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, HeartPulse, Search, UserRound, Users, X } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion } from '../lib/types';
import { clp, fmtDia, hoy } from '../lib/fechas';
import { personaDe } from '../lib/calculos';
import { Avatar, TurnoIcono, primerNombre } from './ui';
import type { Tab } from '../App';

interface Resultado {
  key: string;
  grupo: 'Cuidadoras' | 'Residentes' | 'Clientes';
  icono: ReactNode;
  titulo: string;
  detalle: ReactNode;
  ir: [Tab, string];
}

const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Buscador general: cuidadoras, residentes y clientes, con lo que tienen hoy. */
export function Buscador({ onClose, ir }: { onClose: () => void; ir: (t: Tab, p?: string) => void }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const h = hoy();

  useEffect(() => {
    input.current?.focus();
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);

  const turno = (a: Asignacion) => db.turnos.find((t) => t.id === a.turnoId);
  const piso = (id?: string) => db.pisos.find((p) => p.id === id)?.nombre;
  const texto = normal(q.trim());
  const coincide = (...s: (string | undefined)[]) => s.some((x) => x && normal(x).includes(texto));

  const resultados: Resultado[] = [];
  if (texto.length >= 2) {
    for (const c of db.cuidadoras.filter((c) => coincide(c.nombre))) {
      const hoyA = db.asignaciones.find((a) => a.fecha === h && a.cuidadoraId === c.id);
      const prox = db.asignaciones
        .filter((a) => a.fecha > h && a.cuidadoraId === c.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
      const a = hoyA ?? prox;
      const t = a && turno(a);
      const r = a && personaDe(db, a);
      resultados.push({
        key: c.id, grupo: 'Cuidadoras', icono: <Avatar c={c} size={32} />, titulo: c.nombre,
        detalle: a && t ? (
          <span className="inline-flex items-center gap-1">
            {hoyA ? 'Hoy' : fmtDia(a.fecha)}: <TurnoIcono icono={t.icono} size={12} /> {t.nombre}
            {r ? ` con ${r.nombre}` : ''}{r && piso(r.pisoId) ? ` (${piso(r.pisoId)})` : ''}
          </span>
        ) : 'Sin turnos próximos',
        ir: ['cuidadoras', c.id],
      });
    }
    for (const r of db.personas.filter((r) => coincide(r.nombre))) {
      const cli = db.clientes.find((c) => c.id === r.clienteId);
      const hoyA = db.asignaciones.filter((a) => a.fecha === h && a.personaId === r.id);
      resultados.push({
        key: r.id, grupo: 'Residentes',
        icono: <span className="grid size-8 place-items-center rounded-full bg-primario-50 text-primario"><UserRound size={16} /></span>,
        titulo: r.nombre,
        detalle: (
          <>
            {[piso(r.pisoId), cli && `Cliente: ${cli.nombre}`].filter(Boolean).join(' · ')}
            {hoyA.length > 0 && (
              <span className="block">
                Hoy: {hoyA.map((a) => `${turno(a)?.nombre ?? ''} ${primerNombre(db.cuidadoras.find((c) => c.id === a.cuidadoraId)?.nombre ?? '')}`).join(' · ')}
              </span>
            )}
          </>
        ),
        ir: ['semana', r.nombre],
      });
    }
    for (const c of db.clientes.filter((c) => coincide(c.nombre))) {
      const rs = db.personas.filter((p) => p.clienteId === c.id).map((p) => p.nombre);
      resultados.push({
        key: c.id, grupo: 'Clientes',
        icono: <span className="grid size-8 place-items-center rounded-full bg-info-50 text-info"><HeartPulse size={16} /></span>,
        titulo: c.nombre,
        detalle: [rs.length ? `Residente: ${rs.join(', ')}` : '', `${clp(c.cobroSemanal)} / semana`].filter(Boolean).join(' · '),
        ir: ['clientes', c.nombre],
      });
    }
  }
  const grupos = (['Cuidadoras', 'Residentes', 'Clientes'] as const).map((g) => ({ g, rs: resultados.filter((r) => r.grupo === g) })).filter((x) => x.rs.length);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#111827]/40 p-3 pt-[8vh]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="anim-subir w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-linea px-4">
          <Search size={18} className="text-suave" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && resultados[0] && ir(...resultados[0].ir)}
            placeholder="Buscar cuidadora, residente o cliente…"
            className="flex-1 bg-transparent py-4 text-base outline-none"
          />
          <button onClick={onClose} className="rounded-lg p-1.5 text-suave hover:bg-fondo" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {texto.length < 2 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-suave">
              <Users size={18} /> Escribe al menos 2 letras de un nombre.
            </div>
          ) : grupos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-suave">No se encontró “{q}”.</p>
          ) : (
            grupos.map(({ g, rs }) => (
              <div key={g}>
                <div className="bg-fondo px-4 py-1.5 text-xs font-semibold tracking-wide text-suave uppercase">{g}</div>
                <ul>
                  {rs.map((r) => (
                    <li key={r.key}>
                      <button onClick={() => ir(...r.ir)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primario-50">
                        {r.icono}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.titulo}</span>
                          <span className="block text-xs text-suave">{r.detalle}</span>
                        </span>
                        <ChevronRight size={16} className="text-suave" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
