import { useState } from 'react';
import { AlertTriangle, MessageCircle, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Estado } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { fmtHoras, fmtLargo, fmtHora, uid } from '../lib/fechas';
import { horasDe, linkWhatsApp, turnoSugerido } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Campo, Modal, Segmentado, cx, inputCls, primerNombre } from './ui';

export interface AsignarInicial {
  id?: string;
  fecha: string;
  turnoId?: string;
  cuidadoraId?: string;
}

export function AsignarModal({ inicial, onClose }: { inicial: AsignarInicial; onClose: () => void }) {
  const { db, upsert, remove } = useStore();
  const existente = inicial.id ? db.asignaciones.find((a) => a.id === inicial.id) : undefined;
  const t0 = db.turnos.find((t) => t.id === inicial.turnoId) ?? db.turnos[0];
  const [f, setF] = useState<Asignacion>(
    existente ?? {
      id: uid(), fecha: inicial.fecha, turnoId: t0.id, cuidadoraId: inicial.cuidadoraId ?? '',
      inicio: t0.inicio, fin: t0.fin, estado: 'programado', nota: '',
    },
  );
  const set = (p: Partial<Asignacion>) => setF((x) => ({ ...x, ...p }));

  const activas = db.cuidadoras.filter((c) => c.activa || c.id === f.cuidadoraId);
  const elegida = db.cuidadoras.find((c) => c.id === f.cuidadoraId);
  const turno = db.turnos.find((t) => t.id === f.turnoId);
  const yaTiene = db.asignaciones.filter((a) => a.fecha === f.fecha && a.cuidadoraId === f.cuidadoraId && a.id !== f.id);
  const otrasEnTurno = db.asignaciones.filter((a) => a.fecha === f.fecha && a.turnoId === f.turnoId && a.id !== f.id && a.estado !== 'falto');

  const cambiarHora = (campo: 'inicio' | 'fin', v: string) => {
    const p: Partial<Asignacion> = { [campo]: v };
    if (campo === 'inicio') {
      const sug = turnoSugerido(db.turnos, v);
      if (sug) p.turnoId = sug.id;
    }
    set(p);
  };

  const guardar = () => {
    upsert('asignaciones', f);
    onClose();
  };

  const msg = elegida && turno
    ? `Hola ${primerNombre(elegida.nombre)} 🌸 Te confirmo turno de ${turno.nombre.toLowerCase()} el ${fmtLargo(f.fecha)}, de ${f.inicio} a ${f.fin} hrs. ¡Gracias!`
    : '';

  return (
    <Modal titulo={existente ? 'Editar turno' : 'Asignar turno'} onClose={onClose}>
      <div className="space-y-5">
        <Campo label="Día">
          <input type="date" className={inputCls} value={f.fecha} onChange={(e) => e.target.value && set({ fecha: e.target.value })} />
        </Campo>

        <Campo label="Turno">
          <Segmentado
            valor={f.turnoId}
            onChange={(id) => {
              const t = db.turnos.find((x) => x.id === id)!;
              set({ turnoId: id, inicio: t.inicio, fin: t.fin });
            }}
            opciones={db.turnos.map((t) => ({
              id: t.id,
              label: `${t.emoji} ${t.nombre}`,
              bg: PALETA[t.color].bg,
              fg: PALETA[t.color].fg,
            }))}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Desde">
            <input type="time" className={inputCls} value={f.inicio} onChange={(e) => e.target.value && cambiarHora('inicio', e.target.value)} />
          </Campo>
          <Campo label="Hasta">
            <input type="time" className={inputCls} value={f.fin} onChange={(e) => e.target.value && cambiarHora('fin', e.target.value)} />
          </Campo>
        </div>
        <p className="-mt-3 text-sm text-suave">
          Total: <b className="text-tinta">{fmtHoras(horasDe(f))}</b>. Puedes poner horas sueltas (ej. 17:00 a 20:00) y se ubica sola en el turno que corresponde.
        </p>

        <Campo label="¿Quién va?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {activas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set({ cuidadoraId: c.id })}
                className={cx(
                  'flex items-center gap-2 rounded-2xl border-2 p-2 text-left text-sm font-bold transition',
                  f.cuidadoraId === c.id ? 'border-tinta bg-white' : 'border-linea bg-white/60 hover:border-rosa-2',
                )}
              >
                <Avatar c={c} size={32} />
                <span className="leading-tight">{primerNombre(c.nombre)}</span>
              </button>
            ))}
          </div>
        </Campo>

        {(yaTiene.length > 0 || otrasEnTurno.length > 0) && (
          <div className="flex gap-2 rounded-2xl bg-limon p-3 text-sm text-limon-fg">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              {yaTiene.length > 0 && elegida && (
                <p>{primerNombre(elegida.nombre)} ya tiene otro turno este día ({yaTiene.map((a) => `${fmtHora(a.inicio)}–${fmtHora(a.fin)}`).join(', ')}).</p>
              )}
              {otrasEnTurno.length > 0 && (
                <p>
                  Este turno ya lo cubre {otrasEnTurno.map((a) => primerNombre(db.cuidadoras.find((c) => c.id === a.cuidadoraId)?.nombre ?? '?')).join(' y ')}. Se agregará como segunda persona.
                </p>
              )}
            </div>
          </div>
        )}

        <Campo label="¿Cómo le fue?">
          <Segmentado<Estado>
            valor={f.estado}
            onChange={(estado) => set({ estado })}
            opciones={(Object.keys(ESTADOS) as Estado[]).map((k) => ({ id: k, label: ESTADOS[k].label, bg: ESTADOS[k].bg, fg: ESTADOS[k].fg }))}
          />
        </Campo>

        <Campo label="Nota (opcional)">
          <input className={inputCls} placeholder="Ej: reemplazo, llegó 20 min tarde…" value={f.nota ?? ''} onChange={(e) => set({ nota: e.target.value })} />
        </Campo>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Boton onClick={guardar} disabled={!f.cuidadoraId} className="flex-1">
            Guardar
          </Boton>
          {elegida && (
            <a href={linkWhatsApp(elegida.telefono, msg)} target="_blank" rel="noreferrer">
              <Boton variante="suave" type="button">
                <MessageCircle size={18} /> Avisarle
              </Boton>
            </a>
          )}
          {existente && (
            <Boton
              variante="peligro"
              onClick={() => {
                if (confirm('¿Quitar este turno del calendario?')) {
                  remove('asignaciones', f.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={18} />
            </Boton>
          )}
        </div>
      </div>
    </Modal>
  );
}
