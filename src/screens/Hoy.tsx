import { useState } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, ChevronRight, Plus, Wallet } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Estado } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { clp, diasEntre, fmtDia, fmtHora, fmtLargo, hoy, lunesDe, sumarDias } from '../lib/fechas';
import { horario, huecos, personaDe, pisoDe, requeridasTurno, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Card, TurnoIcono, cx } from '../components/ui';
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
  const faltanTotal = pendientes.reduce((s, p) => s + p.faltan, 0);
  const sinResidentes = db.turnos.every((t) => requeridasTurno(db, t) === 0);

  const horaSaludo = new Date().getHours();
  const saludo = horaSaludo < 12 ? 'Buenos días' : horaSaludo < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = db.ajustes.nombreDuena;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-suave">{fmtLargo(h)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {saludo}{nombre ? `, ${nombre}` : ''}
          </h1>
        </div>
        <div className="flex gap-2">
          <Boton chico variante="suave" onClick={() => ir('caja')}>
            <Plus size={16} /> Registrar ingreso
          </Boton>
          <Boton chico data-tour="hoy-asignar" onClick={() => setModal({ fecha: h })}>
            <CalendarPlus size={16} /> Asignar turno
          </Boton>
        </div>
      </div>

      {/* App vacía: primeros pasos */}
      {(db.personas.length === 0 || db.cuidadoras.length === 0) && (
        <Card className="mb-4">
          <h2 className="font-semibold">Primeros pasos</h2>
          <p className="mt-0.5 text-sm text-suave">Para empezar a usar la app, completa estos datos en orden:</p>
          <ol className="mt-3 space-y-2">
            {[
              { hecho: db.pisos.length > 0, texto: 'Crea los pisos de la residencia', tab: 'ajustes' as Tab },
              { hecho: db.personas.length > 0, texto: 'Agrega los clientes y sus residentes', tab: 'clientes' as Tab },
              { hecho: db.cuidadoras.length > 0, texto: 'Agrega a las cuidadoras', tab: 'cuidadoras' as Tab },
              { hecho: db.asignaciones.length > 0, texto: 'Asigna los turnos en el Calendario', tab: 'semana' as Tab },
            ].map((p, i) => (
              <li key={i}>
                <button onClick={() => ir(p.tab)} className="flex w-full items-center gap-3 rounded-lg border border-linea px-3 py-2.5 text-left text-sm hover:bg-fondo">
                  <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold', p.hecho ? 'bg-ok text-white' : 'bg-fondo text-suave')}>
                    {p.hecho ? <CheckCircle2 size={14} /> : i + 1}
                  </span>
                  <span className={cx('flex-1', p.hecho && 'text-suave line-through')}>{p.texto}</span>
                  <ChevronRight size={16} className="text-suave" />
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Indicadores */}
      <div data-tour="hoy-resumen" className="mb-4 grid grid-cols-2 gap-3">
        <button onClick={() => ir('pagos')} className="rounded-xl border border-linea bg-white p-3 text-left sm:p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition hover:border-primario-200">
          <div className="flex items-center gap-1.5 text-xs text-suave sm:gap-2 sm:text-sm">
            <Wallet size={15} className="shrink-0" /> <span><span className="hidden sm:inline">A pagar el</span><span className="sm:hidden">Pago</span> domingo</span> {fmtDia(domingo).split(' ').slice(1).join(' ')}
          </div>
          <div className="mt-1 text-lg font-semibold leading-tight sm:text-2xl tabular-nums">{clp(aPagar)}</div>
          <div className="text-xs text-suave">{faltanDias === 0 ? 'Hoy es día de pago' : `Faltan ${faltanDias} día${faltanDias > 1 ? 's' : ''}`}</div>
        </button>
        <div className={cx('rounded-xl border p-3 sm:p-4', pendientes.length ? 'border-alerta-200 bg-alerta-50' : 'border-linea bg-white')}>
          <div className={cx('flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm', pendientes.length ? 'text-alerta' : 'text-suave')}>
            {pendientes.length ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} <span>Próximos 7 días</span>
          </div>
          <div className={cx('mt-1 text-lg font-semibold leading-tight sm:text-2xl', pendientes.length > 0 && 'text-alerta')}>
            {pendientes.length ? `${faltanTotal} cupo${faltanTotal > 1 ? "s" : ""} sin cubrir` : sinResidentes ? "Sin residentes aún" : "Todo cubierto"}
          </div>
          <div className="text-xs text-suave">{pendientes.length ? 'Revisa la lista de abajo' : sinResidentes ? "Agrégalos en Clientes" : "Todos los turnos tienen cuidadora"}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card tour="hoy-turnos" className="!p-0">
            <div className="flex items-center justify-between border-b border-linea px-4 py-3">
              <h2 className="font-semibold">Turnos de hoy</h2>
              <span className="hidden text-xs text-suave sm:inline">Marca la asistencia al llegar cada cuidadora</span>
            </div>
            <div className="divide-y divide-linea">
              {db.turnos.map((t) => (
                <FilaTurno key={t.id} fecha={h} turnoId={t.id} onEditar={setModal} onEstado={(a, estado) => upsert('asignaciones', { ...a, estado })} conAsistencia />
              ))}
            </div>
          </Card>

          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-linea px-4 py-3">
              <h2 className="font-semibold">Mañana, {fmtDia(manana)}</h2>
              <button onClick={() => ir('semana')} className="flex items-center text-sm font-medium text-primario hover:underline">
                Ver semana <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-linea">
              {db.turnos.map((t) => (
                <FilaTurno key={t.id} fecha={manana} turnoId={t.id} onEditar={setModal} />
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit !p-0">
          <div className="border-b border-linea px-4 py-3">
            <h2 className="font-semibold">Turnos sin cubrir</h2>
          </div>
          {pendientes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-suave">No hay turnos pendientes en los próximos 7 días.</p>
          ) : (
            <ul className="divide-y divide-linea">
              {pendientes.slice(0, 8).map((p) => (
                <li key={p.fecha + p.turno.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <TurnoIcono icono={p.turno.icono} className="text-suave" />
                    <div>
                      <div className="font-medium">{fmtDia(p.fecha)}</div>
                      <div className="text-xs text-suave">{p.turno.nombre} · {fmtHora(horario(p.turno, p.fecha).inicio)}–{fmtHora(horario(p.turno, p.fecha).fin)} h · <span className="font-medium text-alerta">falta{p.faltan > 1 ? `n ${p.faltan}` : " 1"} {p.donde.length ? `· ${p.donde.join(", ")}` : `(${p.hay}/${p.req})`}</span></div>
                    </div>
                  </div>
                  <Boton chico variante="suave" onClick={() => setModal({ fecha: p.fecha, turnoId: p.turno.id })}>
                    Asignar
                  </Boton>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
  const ordenPiso = (id?: string) => { const i = db.pisos.findIndex((p) => p.id === id); return i < 0 ? 99 : i; };
  const lista = db.asignaciones
    .filter((a) => a.fecha === fecha && a.turnoId === turnoId)
    .sort((a, b) => ordenPiso(pisoDe(db, a)) - ordenPiso(pisoDe(db, b)));
  const col = PALETA[t.color];
  const hay = lista.filter((a) => a.estado !== "falto").length;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
      <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:items-start sm:pt-1">
        <span className="grid size-7 place-items-center rounded-md" style={{ background: col.bg, color: col.fg }}>
          <TurnoIcono icono={t.icono} size={15} />
        </span>
        <div className="flex items-baseline gap-2 leading-tight sm:block">
          <div className="text-sm font-medium">{t.nombre}</div>
          <div className="text-xs text-suave">{fmtHora(horario(t, fecha).inicio)}–{fmtHora(horario(t, fecha).fin)} h</div>
          {requeridasTurno(db, t) > 0 && <div className={cx("mt-0.5 text-xs font-medium tabular-nums", hay >= requeridasTurno(db, t) ? "text-ok" : "text-alerta")}>{hay} de {requeridasTurno(db, t)}</div>}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {lista.length === 0 && requeridasTurno(db, t) > 0 && (
          <button
            onClick={() => onEditar({ fecha, turnoId })}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-alerta-200 bg-alerta-50 px-3 py-2 text-sm font-medium text-alerta hover:bg-[#fbe9e7]"
          >
            <AlertTriangle size={15} /> Sin cubrir · asignar cuidadoras
          </button>
        )}
        {lista.length === 0 && requeridasTurno(db, t) === 0 && (
          <button onClick={() => onEditar({ fecha, turnoId })} className="py-1.5 text-sm text-suave hover:text-primario">
            Sin asignaciones · <span className="font-medium">Asignar</span>
          </button>
        )}
        {lista.map((a) => {
          const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
          if (!c) return null;
          return (
            <div key={a.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => onEditar({ fecha, id: a.id })}>
                <Avatar c={c} size={36} />
                <div className="min-w-0">
                  <div className={cx('truncate text-[15px] font-medium sm:text-sm', a.estado === 'falto' && 'text-suave line-through')}>{c.nombre}</div>
                  <div className="truncate text-xs text-suave">
                    {[personaDe(db, a)?.nombre, db.pisos.find((p) => p.id === pisoDe(db, a))?.nombre].filter(Boolean).join(' · ')}
                    {a.nota ? ` · ${a.nota}` : ''}
                  </div>
                </div>
              </button>
              {conAsistencia && onEstado ? (
                <div className="grid shrink-0 grid-cols-3 overflow-hidden rounded-lg border border-[#d1d5db] sm:w-60">
                  {(['asistio', 'atraso', 'falto'] as Estado[]).map((e, i) => (
                    <button
                      key={e}
                      onClick={() => onEstado(a, a.estado === e ? 'programado' : e)}
                      className={cx('py-2.5 text-sm font-medium transition sm:py-1.5 sm:text-xs', i > 0 && 'border-l border-[#d1d5db]', a.estado !== e && 'bg-white text-suave hover:bg-fondo')}
                      style={a.estado === e ? { background: ESTADOS[e].bg, color: ESTADOS[e].fg } : undefined}
                    >
                      {ESTADOS[e].corto}
                    </button>
                  ))}
                </div>
              ) : (
                a.estado !== 'programado' && (
                  <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: ESTADOS[a.estado].bg, color: ESTADOS[a.estado].fg }}>
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
