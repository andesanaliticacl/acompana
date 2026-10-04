import { useState } from 'react';
import { AlertCircle, CalendarPlus, Cake, ChevronRight, HandCoins, Plus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Estado } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { clp, diasACumple, diasEntre, edad, fmtDia, fmtHora, fmtHoras, fmtLargo, hoy, lunesDe, sumarDias } from '../lib/fechas';
import { horasDe, huecos, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Card, cx, primerNombre } from '../components/ui';
import { AsignarModal, type AsignarInicial } from '../components/AsignarModal';
import type { Tab } from '../App';

export function Hoy({ ir }: { ir: (t: Tab) => void }) {
  const { db, upsert } = useStore();
  const [modal, setModal] = useState<AsignarInicial | null>(null);
  const h = hoy();
  const manana = sumarDias(h, 1);
  const lunes = lunesDe(h);
  const domingo = sumarDias(lunes, 6);
  const faltanDias = diasEntre(h, domingo);
  const aPagar = db.cuidadoras.reduce((s, c) => {
    const r = resumenSemana(db, c.id, lunes);
    return s + (r.pagado ? 0 : r.total);
  }, 0);
  const pendientes = huecos(db, h, 7);
  const cumples = db.cuidadoras
    .filter((c) => c.activa && diasACumple(c.fechaNacimiento) <= 14)
    .sort((a, b) => diasACumple(a.fechaNacimiento) - diasACumple(b.fechaNacimiento));

  const horaSaludo = new Date().getHours();
  const saludo = horaSaludo < 12 ? 'Buenos días' : horaSaludo < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = db.ajustes.nombreDuena;

  return (
    <div>
      <div className="mb-5">
        <p className="font-bold text-suave">{fmtLargo(h)}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {saludo}{nombre ? `, ${nombre}` : ''} 🐾
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">¿Quién cuida hoy?</h2>
              <Boton chico variante="suave" onClick={() => setModal({ fecha: h })}>
                <Plus size={16} /> Asignar
              </Boton>
            </div>
            <div className="space-y-3">
              {db.turnos.map((t) => (
                <FilaTurno key={t.id} fecha={h} turnoId={t.id} onEditar={setModal} onEstado={(a, estado) => upsert('asignaciones', { ...a, estado })} conAsistencia />
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mañana · {fmtDia(manana)}</h2>
              <button onClick={() => ir('semana')} className="flex items-center text-sm font-bold text-rosa-fg">
                Ver semana <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {db.turnos.map((t) => (
                <FilaTurno key={t.id} fecha={manana} turnoId={t.id} onEditar={setModal} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="tigre overflow-hidden rounded-3xl p-1.5">
            <div className="rounded-[1.25rem] bg-white/95 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-durazno-fg">
                <HandCoins size={18} /> Pago del domingo {fmtDia(domingo).split(' ').slice(1).join(' ')}
              </div>
              <div className="mt-1 font-display text-3xl font-semibold">{clp(aPagar)}</div>
              <p className="text-sm text-suave">
                {faltanDias === 0 ? '¡Hoy es día de pago! 🎉' : `Faltan ${faltanDias} día${faltanDias > 1 ? 's' : ''}`}
              </p>
              <Boton chico className="mt-3 w-full" onClick={() => ir('pagos')}>
                Ver detalle de pagos
              </Boton>
            </div>
          </div>

          <Card className={cx(pendientes.length > 0 && 'border-rosa-2')}>
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className={pendientes.length ? 'text-rosa-fg' : 'text-menta-fg'} />
              <h2 className="text-lg font-semibold">
                {pendientes.length ? `${pendientes.length} turno${pendientes.length > 1 ? 's' : ''} sin cubrir` : 'Todo cubierto 7 días ✨'}
              </h2>
            </div>
            {pendientes.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {pendientes.slice(0, 5).map((p) => (
                  <li key={p.fecha + p.turno.id}>
                    <button
                      onClick={() => setModal({ fecha: p.fecha, turnoId: p.turno.id })}
                      className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-rosa-2 px-3 py-2 text-left text-sm font-bold hover:bg-rosa"
                    >
                      <span>{p.turno.emoji} {fmtDia(p.fecha)} · {p.turno.nombre}</span>
                      <span className="text-rosa-fg">Cubrir</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {cumples.length > 0 && (
            <Card className="dalmata-suave">
              <div className="flex items-center gap-2 font-semibold">
                <Cake size={20} className="text-rosa-fg" /> Cumpleaños cerca
              </div>
              <ul className="mt-2 space-y-2">
                {cumples.map((c) => {
                  const d = diasACumple(c.fechaNacimiento);
                  return (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <Avatar c={c} size={28} />
                      <span className="font-bold">{primerNombre(c.nombre)}</span>
                      <span className="text-suave">
                        cumple {edad(c.fechaNacimiento) + 1} {d === 0 ? 'hoy 🎂' : d === 1 ? 'mañana' : `en ${d} días`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Boton variante="suave" className="!rounded-3xl !py-4" onClick={() => setModal({ fecha: h })}>
              <CalendarPlus size={18} /> Turno
            </Boton>
            <Boton variante="suave" className="!rounded-3xl !bg-menta !py-4 !text-menta-fg" onClick={() => ir('caja')}>
              <Plus size={18} /> Ingreso
            </Boton>
          </div>
        </div>
      </div>

      {modal && <AsignarModal inicial={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function FilaTurno({
  fecha, turnoId, onEditar, onEstado, conAsistencia,
}: {
  fecha: string;
  turnoId: string;
  onEditar: (i: AsignarInicial) => void;
  onEstado?: (a: Asignacion, e: Estado) => void;
  conAsistencia?: boolean;
}) {
  const { db } = useStore();
  const t = db.turnos.find((x) => x.id === turnoId)!;
  const lista = db.asignaciones.filter((a) => a.fecha === fecha && a.turnoId === turnoId);
  const col = PALETA[t.color];

  return (
    <div className="rounded-2xl p-3" style={{ background: col.bg }}>
      <div className="mb-1 flex items-center justify-between text-sm font-bold" style={{ color: col.fg }}>
        <span>{t.emoji} {t.nombre}</span>
        <span>{fmtHora(t.inicio)}–{fmtHora(t.fin)} h</span>
      </div>
      {lista.length === 0 && (
        <button
          onClick={() => onEditar({ fecha, turnoId })}
          className="w-full rounded-xl border-2 border-dashed bg-white/60 py-2 text-sm font-bold"
          style={{ borderColor: col.dot, color: col.fg }}
        >
          Sin cubrir · toca para asignar
        </button>
      )}
      <div className="space-y-2">
        {lista.map((a) => {
          const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
          if (!c) return null;
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/80 p-2">
              <button className="flex min-w-[11rem] flex-1 items-center gap-2.5 text-left" onClick={() => onEditar({ fecha, id: a.id })}>
                <Avatar c={c} size={36} />
                <div className="min-w-0">
                  <div className={cx('truncate font-bold', a.estado === 'falto' && 'line-through opacity-60')}>{c.nombre}</div>
                  <div className="text-xs text-suave">
                    {fmtHora(a.inicio)}–{fmtHora(a.fin)} h · {fmtHoras(horasDe(a))}
                    {a.nota ? ` · ${a.nota}` : ''}
                  </div>
                </div>
              </button>
              {conAsistencia && onEstado ? (
                <div className="flex flex-1 justify-end gap-1 sm:flex-none">
                  {(['asistio', 'atraso', 'falto'] as Estado[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => onEstado(a, a.estado === e ? 'programado' : e)}
                      className={cx('flex-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:flex-none', a.estado !== e && 'bg-[#f6f1f3] text-suave hover:brightness-95')}
                      style={a.estado === e ? { background: ESTADOS[e].bg, color: ESTADOS[e].fg, boxShadow: `inset 0 0 0 2px ${ESTADOS[e].fg}` } : undefined}
                    >
                      {ESTADOS[e].corto}
                    </button>
                  ))}
                </div>
              ) : (
                a.estado !== 'programado' && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: ESTADOS[a.estado].bg, color: ESTADOS[a.estado].fg }}>
                    {ESTADOS[a.estado].label}
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
