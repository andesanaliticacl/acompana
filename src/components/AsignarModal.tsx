import { useState } from 'react';
import { AlertTriangle, Check, MessageCircle, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Estado } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { fmtHoras, fmtLargo, uid } from '../lib/fechas';
import { horario, horasDe, linkWhatsApp, requeridasPiso, requeridasTurno, turnoSugerido } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Campo, Modal, Segmentado, TurnoIcono, cx, inputCls, primerNombre } from './ui';

export interface AsignarInicial {
  id?: string;
  fecha: string;
  turnoId?: string;
  pisoId?: string;
  cuidadoraId?: string;
}

/**
 * Crear: se pueden elegir varias cuidadoras para el mismo turno (una asignación por persona).
 * Editar: una asignación existente (cambiar horario, estado, nota o persona).
 */
export function AsignarModal({ inicial, onClose }: { inicial: AsignarInicial; onClose: () => void }) {
  const { db, upsert, upsertMuchos, remove } = useStore();
  const existente = inicial.id ? db.asignaciones.find((a) => a.id === inicial.id) : undefined;
  const t0 = db.turnos.find((t) => t.id === inicial.turnoId) ?? db.turnos[0];
  const [f, setF] = useState<Asignacion>(
    existente ?? {
      id: uid(), fecha: inicial.fecha, turnoId: t0.id, pisoId: inicial.pisoId ?? db.pisos[0]?.id, cuidadoraId: '', ...horario(t0, inicial.fecha), estado: 'programado', nota: '',
    },
  );
  const [elegidas, setElegidas] = useState<string[]>(existente ? [existente.cuidadoraId] : inicial.cuidadoraId ? [inicial.cuidadoraId] : []);
  const set = (p: Partial<Asignacion>) => setF((x) => ({ ...x, ...p }));
  const turno = db.turnos.find((t) => t.id === f.turnoId);

  // Ocupadas: ya tienen algún turno ese día (no se pueden duplicar)
  const ocupadas = new Map(
    db.asignaciones.filter((a) => a.fecha === f.fecha && a.id !== f.id).map((a) => [a.cuidadoraId, a]),
  );
  const piso = db.pisos.find((p) => p.id === f.pisoId);
  const enEsteTurno = db.asignaciones.filter(
    (a) => a.fecha === f.fecha && a.turnoId === f.turnoId && a.id !== f.id && a.estado !== 'falto' && (!piso || a.pisoId === piso.id),
  ).length;
  const requeridas = piso && turno ? requeridasPiso(piso, turno.id) : turno ? requeridasTurno(db, turno) : 1;
  const total = enEsteTurno + elegidas.length;
  const activas = db.cuidadoras
    .filter((c) => c.activa || elegidas.includes(c.id))
    .sort((a, b) => Number(ocupadas.has(a.id)) - Number(ocupadas.has(b.id)) || a.nombre.localeCompare(b.nombre));

  const toggle = (id: string) => {
    if (existente) return setElegidas([id]);
    setElegidas((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

  const cambiarFecha = (fecha: string) => {
    const t = turno ?? t0;
    const antes = horario(t, f.fecha);
    // Si tenía el horario normal del turno, lo actualizamos al de la nueva fecha (ej. domingo 9:00)
    const p: Partial<Asignacion> = { fecha };
    if (f.inicio === antes.inicio && f.fin === antes.fin) Object.assign(p, horario(t, fecha));
    set(p);
  };

  const cambiarHora = (campo: 'inicio' | 'fin', v: string) => {
    const p: Partial<Asignacion> = { [campo]: v };
    if (campo === 'inicio') {
      const sug = turnoSugerido(db.turnos, v);
      if (sug) p.turnoId = sug.id;
    }
    set(p);
  };

  const guardar = () => {
    if (existente) upsert('asignaciones', { ...f, cuidadoraId: elegidas[0] });
    else upsertMuchos('asignaciones', elegidas.map((cid) => ({ ...f, id: uid(), cuidadoraId: cid })));
    onClose();
  };

  const unica = elegidas.length === 1 ? db.cuidadoras.find((c) => c.id === elegidas[0]) : undefined;
  const msg = unica && turno
    ? `Hola ${primerNombre(unica.nombre)}, te confirmo turno de ${turno.nombre.toLowerCase()}${piso ? ` en ${piso.nombre}` : ""} el ${fmtLargo(f.fecha)}, de ${f.inicio} a ${f.fin} hrs. Gracias.`
    : '';

  return (
    <Modal titulo={existente ? 'Editar turno' : 'Asignar turno'} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha">
            <input type="date" className={inputCls} value={f.fecha} onChange={(e) => e.target.value && cambiarFecha(e.target.value)} />
          </Campo>
          <Campo label="Turno">
            <Segmentado
              valor={f.turnoId}
              onChange={(id) => {
                const t = db.turnos.find((x) => x.id === id)!;
                set({ turnoId: id, ...horario(t, f.fecha) });
              }}
              opciones={db.turnos.map((t) => ({
                id: t.id,
                label: <><TurnoIcono icono={t.icono} size={15} /> {t.nombre}</>,
                bg: PALETA[t.color].bg,
                fg: PALETA[t.color].fg,
              }))}
            />
          </Campo>
        </div>

        {db.pisos.length > 0 && (
          <Campo label="Piso">
            <Segmentado
              valor={f.pisoId ?? ''}
              onChange={(pisoId) => set({ pisoId })}
              opciones={db.pisos.map((p) => ({ id: p.id, label: p.nombre }))}
            />
          </Campo>
        )}

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde">
              <input type="time" className={inputCls} value={f.inicio} onChange={(e) => e.target.value && cambiarHora('inicio', e.target.value)} />
            </Campo>
            <Campo label="Hasta">
              <input type="time" className={inputCls} value={f.fin} onChange={(e) => e.target.value && cambiarHora('fin', e.target.value)} />
            </Campo>
          </div>
          <p className="mt-1.5 text-xs text-suave">
            {fmtHoras(horasDe(f))} por persona. Para horas sueltas (ej. 16:00 a 20:00) cambia el horario solo para este caso.
          </p>
        </div>

        <Campo label={existente ? 'Cuidadora' : 'Cuidadoras (puedes elegir varias)'}>
          {!existente && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-fondo px-3 py-2 text-sm">
              <span className="text-suave">{piso ? `${piso.nombre} · ${turno?.nombre ?? ''}` : 'Cobertura del turno'}</span>
              <span className={cx('font-semibold tabular-nums', total >= requeridas ? 'text-ok' : 'text-alerta')}>
                {total} de {requeridas} {total >= requeridas ? '· completo' : `· faltan ${requeridas - total}`}
              </span>
            </div>
          )}
          <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {activas.map((c) => {
              const on = elegidas.includes(c.id);
              const ocu = ocupadas.get(c.id);
              const tOcu = ocu && db.turnos.find((t) => t.id === ocu.turnoId);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!!ocu && !on}
                  onClick={() => toggle(c.id)}
                  className={cx(
                    'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45',
                    on ? 'border-primario bg-primario-50' : 'border-[#d1d5db] bg-white hover:bg-fondo',
                  )}
                >
                  <Avatar c={c} size={30} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-medium">{c.nombre}</span>
                    <span className="block text-xs text-suave">{ocu ? `Ya está en ${tOcu?.nombre.toLowerCase() ?? 'otro turno'}` : `${c.experiencia} años de exp.`}</span>
                  </span>
                  <span className={cx('grid size-5 shrink-0 place-items-center rounded border', on ? 'border-primario bg-primario text-white' : 'border-[#d1d5db]')}>
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Campo>

        {existente && (
          <Campo label="Asistencia">
            <Segmentado<Estado>
              valor={f.estado}
              onChange={(estado) => set({ estado })}
              opciones={(Object.keys(ESTADOS) as Estado[]).map((k) => ({ id: k, label: ESTADOS[k].label, bg: ESTADOS[k].bg, fg: ESTADOS[k].fg }))}
            />
          </Campo>
        )}

        <Campo label="Nota (opcional)">
          <input className={inputCls} placeholder="Ej: paciente Sra. Inés, reemplazo…" value={f.nota ?? ''} onChange={(e) => set({ nota: e.target.value })} />
        </Campo>

        {!existente && total > requeridas && (
          <div className="flex gap-2 rounded-lg bg-aviso-50 p-3 text-sm text-aviso">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            Quedarán {total} cuidadoras en un turno que necesita {requeridas}.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <Boton onClick={guardar} disabled={!elegidas.length} className="flex-1">
            {existente ? 'Guardar cambios' : elegidas.length > 1 ? `Asignar ${elegidas.length} cuidadoras` : 'Asignar'}
          </Boton>
          {unica && (
            <a href={linkWhatsApp(unica.telefono, msg)} target="_blank" rel="noreferrer">
              <Boton variante="suave" type="button">
                <MessageCircle size={18} /> Avisar
              </Boton>
            </a>
          )}
          {existente && (
            <Boton
              variante="peligro"
              onClick={() => {
                if (confirm('¿Quitar a esta cuidadora del turno?')) {
                  remove('asignaciones', f.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={18} /> Quitar
            </Boton>
          )}
        </div>
      </div>
    </Modal>
  );
}
