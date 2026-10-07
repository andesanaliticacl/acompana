import { useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Download, Plus, Users, X } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Turno } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { DIAS_CORTOS, diasSemana, fmtCorto, fmtDia, fmtHora, fmtHoras, fmtLargo, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { asignacionesSemana, descargarCSV, horario, horasDe, huecos, requeridasPiso, requeridasTurno, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Segmentado, Titulo, TurnoIcono, cx } from '../components/ui';
import { AsignarModal, type AsignarInicial } from '../components/AsignarModal';

type Vista = 'dia' | 'cuidadora';

const leerVista = (): Vista => {
  try {
    return localStorage.getItem('acompana-vista') === 'cuidadora' ? 'cuidadora' : 'dia';
  } catch {
    return 'dia';
  }
};

export function Semana() {
  const { db, upsertMuchos } = useStore();
  const h = hoy();
  const [fecha, setFecha] = useState(h);
  const [vista, setVistaState] = useState<Vista>(leerVista);
  const [modal, setModal] = useState<AsignarInicial | null>(null);
  const lunes = lunesDe(fecha);
  const dias = diasSemana(lunes);
  const delaSemana = asignacionesSemana(db, lunes);

  const setVista = (v: Vista) => {
    setVistaState(v);
    try { localStorage.setItem('acompana-vista', v); } catch { /* ignorar */ }
  };

  const copiarAnterior = () => {
    const ant = asignacionesSemana(db, sumarDias(lunes, -7));
    const nuevas: Asignacion[] = [];
    for (const a of ant) {
      const f = sumarDias(a.fecha, 7);
      if (delaSemana.some((x) => x.fecha === f && x.cuidadoraId === a.cuidadoraId)) continue;
      const t = db.turnos.find((x) => x.id === a.turnoId);
      const normal = t && horario(t, a.fecha);
      const horas = t && normal && normal.inicio === a.inicio && normal.fin === a.fin ? horario(t, f) : { inicio: a.inicio, fin: a.fin };
      nuevas.push({ ...a, ...horas, id: uid(), fecha: f, estado: 'programado', nota: '' });
    }
    if (!nuevas.length) return alert('No hay nada que copiar: esta semana ya tiene a las mismas cuidadoras.');
    if (confirm(`Se copiarán ${nuevas.length} asignaciones de la semana anterior. ¿Continuar?`)) upsertMuchos('asignaciones', nuevas);
  };

  const exportar = () => {
    const filas: (string | number)[][] = [['Fecha', 'Turno', 'Piso', 'Cuidadora', 'Desde', 'Hasta', 'Horas', 'Estado', 'Nota']];
    for (const a of [...delaSemana].sort((x, y) => (x.fecha + x.inicio).localeCompare(y.fecha + y.inicio))) {
      filas.push([
        a.fecha, db.turnos.find((t) => t.id === a.turnoId)?.nombre ?? '', db.pisos.find((p) => p.id === a.pisoId)?.nombre ?? '',
        db.cuidadoras.find((c) => c.id === a.cuidadoraId)?.nombre ?? '',
        a.inicio, a.fin, String(horasDe(a)).replace('.', ','), ESTADOS[a.estado].label, a.nota ?? '',
      ]);
    }
    descargarCSV(`turnos-semana-${lunes}.csv`, filas);
  };

  return (
    <div>
      <Titulo titulo="Calendario">
        <Segmentado<Vista>
          valor={vista}
          onChange={setVista}
          opciones={[
            { id: 'dia', label: <><CalendarDays size={15} /> Día a día</> },
            { id: 'cuidadora', label: <><Users size={15} /> Semana por cuidadora</> },
          ]}
        />
      </Titulo>

      {/* Navegación: semana + selector de día */}
      <div className="mb-5 rounded-xl border border-linea bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={() => setFecha(sumarDias(fecha, -7))} className="rounded-lg border border-linea bg-white p-2 hover:bg-fondo" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-36 text-center text-sm font-semibold">
            {fmtCorto(dias[0])} – {fmtCorto(dias[6])}
          </div>
          <button onClick={() => setFecha(sumarDias(fecha, 7))} className="rounded-lg border border-linea bg-white p-2 hover:bg-fondo" aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
          {fecha !== h && (
            <Boton chico variante="fantasma" onClick={() => setFecha(h)}>
              Hoy
            </Boton>
          )}
          <div className="ml-auto flex gap-2">
            <Boton variante="suave" chico onClick={copiarAnterior} title="Copiar la semana anterior">
              <Copy size={15} /> <span className="hidden sm:inline">Copiar semana anterior</span>
            </Boton>
            <Boton variante="suave" chico onClick={exportar} title="Descargar Excel">
              <Download size={15} /> <span className="hidden sm:inline">Excel</span>
            </Boton>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dias.map((d, i) => {
            const faltan = huecos(db, d, 1).reduce((s, x) => s + x.faltan, 0);
            const sel = vista === 'dia' && d === fecha;
            return (
              <button
                key={d}
                onClick={() => { setFecha(d); setVista('dia'); }}
                className={cx(
                  'flex flex-col items-center rounded-lg border py-1.5 transition',
                  sel ? 'border-primario bg-primario text-white' : 'border-linea bg-white hover:bg-fondo',
                )}
              >
                <span className={cx('text-[11px] font-medium uppercase', sel ? 'text-white/80' : 'text-suave')}>{DIAS_CORTOS[i]}</span>
                <span className={cx('text-lg leading-tight font-semibold', !sel && d === h && 'text-primario')}>{Number(d.slice(8))}</span>
                {/* Celular: punto verde o número rojo · Computador: texto */}
                <span className="mt-1 sm:hidden">
                  {faltan ? (
                    <span className={cx('grid size-4 place-items-center rounded-full text-[10px] font-bold', sel ? 'bg-white text-alerta' : 'bg-alerta text-white')}>{faltan}</span>
                  ) : (
                    <span className={cx('block size-2 rounded-full', sel ? 'bg-white' : 'bg-ok')} />
                  )}
                </span>
                <span
                  className={cx(
                    'mt-0.5 hidden rounded px-1 text-[10px] font-semibold sm:inline',
                    faltan ? (sel ? 'bg-white text-alerta' : 'bg-alerta-50 text-alerta') : sel ? 'text-white/80' : 'text-ok',
                  )}
                >
                  {faltan ? `Faltan ${faltan}` : 'Completo'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {vista === 'dia' ? (
        <VistaDia fecha={fecha} onModal={setModal} />
      ) : (
        <VistaCuidadoras dias={dias} lunes={lunes} delaSemana={delaSemana} onModal={setModal} />
      )}

      {modal && <AsignarModal inicial={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ───────────── Vista día a día: Día y Noche, piso por piso ───────────── */

function VistaDia({ fecha, onModal }: { fecha: string; onModal: (i: AsignarInicial) => void }) {
  const { db } = useStore();
  const delDia = db.asignaciones.filter((a) => a.fecha === fecha);
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{fmtLargo(fecha)}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {db.turnos.map((t) => (
          <ColumnaTurno key={t.id} t={t} fecha={fecha} lista={delDia.filter((a) => a.turnoId === t.id)} onModal={onModal} />
        ))}
      </div>
      <Leyenda />
    </div>
  );
}

function ColumnaTurno({ t, fecha, lista, onModal }: { t: Turno; fecha: string; lista: Asignacion[]; onModal: (i: AsignarInicial) => void }) {
  const { db } = useStore();
  const col = PALETA[t.color];
  const hor = horario(t, fecha);
  const especial = hor.inicio !== t.inicio || hor.fin !== t.fin;
  const hay = lista.filter((a) => a.estado !== 'falto').length;
  const req = requeridasTurno(db, t);

  // Grupos: un bloque por piso (o uno solo si no hay pisos) + las que no tienen piso
  const grupos = db.pisos.length
    ? [
        ...db.pisos.map((p) => ({ id: p.id, nombre: p.nombre, req: requeridasPiso(p, t.id), items: lista.filter((a) => a.pisoId === p.id) })),
        { id: '__sin', nombre: 'Sin piso', req: 0, items: lista.filter((a) => !db.pisos.some((p) => p.id === a.pisoId)) },
      ].filter((g) => g.req > 0 || g.items.length > 0)
    : [{ id: '__todos', nombre: 'Cuidadoras', req, items: lista }];

  return (
    <section className="overflow-hidden rounded-xl border border-linea bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center gap-3 border-b border-linea px-4 py-3" style={{ background: col.bg }}>
        <span className="grid size-10 place-items-center rounded-lg bg-white" style={{ color: col.fg }}>
          <TurnoIcono icono={t.icono} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold" style={{ color: col.fg }}>Turno {t.nombre.toLowerCase()}</div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: col.fg }}>
            {hor.inicio} a {hor.fin} h
            {especial && <span className="rounded bg-white/70 px-1.5 text-[11px] font-semibold">Horario especial</span>}
          </div>
        </div>
        <Cobertura hay={hay} req={req} grande />
      </header>

      <div className="divide-y divide-linea">
        {grupos.map((g) => {
          const activos = g.items.filter((a) => a.estado !== 'falto').length;
          const libres = Math.max(0, g.req - activos);
          const pisoId = g.id.startsWith('__') ? undefined : g.id;
          return (
            <div key={g.id} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{g.nombre}</span>
                {g.req > 0 && <Cobertura hay={activos} req={g.req} />}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((a) => <FilaPersona key={a.id} a={a} t={t} onClick={() => onModal({ fecha, id: a.id })} />)}
                {Array.from({ length: libres }, (_, i) => (
                  <li key={`libre${i}`}>
                    <button
                      onClick={() => onModal({ fecha, turnoId: t.id, pisoId })}
                      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-alerta-200 bg-alerta-50 px-3 py-2 text-left text-sm font-medium text-alerta transition hover:bg-[#fbe9e7]"
                    >
                      <span className="grid size-8 place-items-center rounded-full border border-dashed border-alerta-200 bg-white">
                        <Plus size={15} />
                      </span>
                      Falta asignar cuidadora
                    </button>
                  </li>
                ))}
              </ul>
              {libres === 0 && (
                <button
                  onClick={() => onModal({ fecha, turnoId: t.id, pisoId })}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-suave hover:text-primario"
                >
                  <Plus size={13} /> Agregar otra
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FilaPersona({ a, t, onClick }: { a: Asignacion; t: Turno; onClick: () => void }) {
  const { db } = useStore();
  const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
  if (!c) return null;
  const normal = horario(t, a.fecha);
  const distinto = normal.inicio !== a.inicio || normal.fin !== a.fin;
  const e = ESTADOS[a.estado];
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-linea px-3 py-2 text-left transition hover:border-primario-200 hover:bg-fondo">
        <Avatar c={c} size={32} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm font-medium', a.estado === 'falto' && 'text-suave line-through')}>{c.nombre}</span>
          {(distinto || a.nota) && (
            <span className="block truncate text-xs text-suave">
              {distinto && <span className="font-medium text-aviso">{fmtHora(a.inicio)}–{fmtHora(a.fin)} h</span>}
              {distinto && a.nota && ' · '}
              {a.nota}
            </span>
          )}
        </span>
        {a.estado !== 'programado' && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: e.bg, color: e.fg }}>
            {e.label}
          </span>
        )}
      </button>
    </li>
  );
}

function Cobertura({ hay, req, grande }: { hay: number; req: number; grande?: boolean }) {
  const ok = hay >= req;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-md font-semibold tabular-nums',
        grande ? 'bg-white px-2.5 py-1 text-sm' : 'px-1.5 py-0.5 text-xs',
        ok ? 'text-ok' : 'text-alerta',
        !grande && (ok ? 'bg-ok-50' : 'bg-alerta-50'),
      )}
      title={`${hay} de ${req} cuidadoras`}
    >
      {ok ? <Check size={grande ? 14 : 12} strokeWidth={3} /> : <AlertTriangle size={grande ? 14 : 12} />} {hay}/{req}
    </span>
  );
}

function IconoEstado({ estado }: { estado: Asignacion['estado'] }) {
  if (estado === 'asistio') return <Check size={12} strokeWidth={3} className="shrink-0 text-ok" />;
  if (estado === 'atraso') return <Clock size={12} strokeWidth={2.5} className="shrink-0 text-aviso" />;
  if (estado === 'falto') return <X size={12} strokeWidth={3} className="shrink-0 text-alerta" />;
  return null;
}

/* ───────────── Semana por cuidadora: una fila por persona, como planilla ───────────── */

function VistaCuidadoras({ dias, lunes, delaSemana, onModal }: { dias: string[]; lunes: string; delaSemana: Asignacion[]; onModal: (i: AsignarInicial) => void }) {
  const { db } = useStore();
  const h = hoy();
  const primerTurno = db.turnos[0]?.id;
  const cuenta = (cid: string) => delaSemana.filter((x) => x.cuidadoraId === cid && x.turnoId === primerTurno).length;
  const filas = db.cuidadoras
    .filter((c) => c.activa || delaSemana.some((a) => a.cuidadoraId === c.id))
    .map((c) => ({ c, r: resumenSemana(db, c.id, lunes) }))
    // agrupa: primero quienes hacen más turnos de día, luego las de noche
    .sort((a, b) => cuenta(b.c.id) - cuenta(a.c.id) || b.r.horas - a.r.horas || a.c.nombre.localeCompare(b.c.nombre));

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="bg-fondo">
                <th className="sticky left-0 z-10 w-48 border-b border-linea bg-fondo px-3 py-2 text-left text-xs font-medium text-suave">Cuidadora</th>
                {dias.map((d, i) => (
                  <th key={d} className={cx('border-b border-l border-linea px-1 py-2 text-center', d === h && 'bg-primario-50')}>
                    <div className="text-[11px] font-medium tracking-wide text-suave uppercase">{DIAS_CORTOS[i]}</div>
                    <div className={cx('font-semibold', d === h && 'text-primario')}>{Number(d.slice(8))}</div>
                  </th>
                ))}
                <th className="w-20 border-b border-l border-linea px-2 py-2 text-right text-xs font-medium text-suave">Horas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ c, r }) => (
                <tr key={c.id} className="group/fila hover:bg-[#fafbfc]">
                  <td className="sticky left-0 z-10 border-b border-linea bg-white px-3 py-1.5 group-hover/fila:bg-[#fafbfc]">
                    <div className="flex items-center gap-2">
                      <Avatar c={c} size={26} />
                      <span className="truncate font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  {dias.map((d) => {
                    const a = delaSemana.find((x) => x.fecha === d && x.cuidadoraId === c.id);
                    const t = a && db.turnos.find((x) => x.id === a.turnoId);
                    const p = a && db.pisos.find((x) => x.id === a.pisoId);
                    return (
                      <td key={d} className={cx('border-b border-l border-linea p-1 text-center', d === h && 'bg-primario-50/50')}>
                        {a && t ? (
                          <button
                            onClick={() => onModal({ fecha: d, id: a.id })}
                            className={cx('flex w-full flex-col items-center rounded-md px-1 py-1 text-xs leading-tight font-semibold transition hover:brightness-95', a.estado === 'falto' && 'line-through opacity-60')}
                            style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}
                            title={`${t.nombre}${p ? ` · ${p.nombre}` : ''} · ${a.inicio}–${a.fin}${a.nota ? ` · ${a.nota}` : ''}`}
                          >
                            <span className="flex items-center gap-1"><TurnoIcono icono={t.icono} size={11} /> {t.nombre} <IconoEstado estado={a.estado} /></span>
                            {p && <span className="text-[10px] font-medium opacity-80">{p.nombre}</span>}
                          </button>
                        ) : (
                          <button
                            onClick={() => onModal({ fecha: d, cuidadoraId: c.id })}
                            className="w-full rounded-md py-1.5 text-suave opacity-0 transition group-hover/fila:opacity-100 hover:bg-fondo"
                            aria-label={`Asignar a ${c.nombre} el ${fmtDia(d)}`}
                          >
                            <Plus size={13} className="mx-auto" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-linea px-2 text-right font-semibold tabular-nums">{r.horas ? fmtHoras(r.horas) : <span className="text-suave">—</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {db.turnos.map((t) => (
                <tr key={t.id} className="bg-fondo">
                  <td className="sticky left-0 z-10 border-b border-linea bg-fondo px-3 py-2 text-xs font-medium text-suave">
                    <span className="flex items-center gap-1.5"><TurnoIcono icono={t.icono} size={13} /> Cobertura {t.nombre.toLowerCase()}</span>
                  </td>
                  {dias.map((d) => {
                    const hay = delaSemana.filter((a) => a.fecha === d && a.turnoId === t.id && a.estado !== 'falto').length;
                    return (
                      <td key={d} className="border-b border-l border-linea p-1 text-center">
                        <Cobertura hay={hay} req={requeridasTurno(db, t)} />
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-linea" />
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      </div>
      <Leyenda />
    </div>
  );
}

function Leyenda() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
      <span className="flex items-center gap-1"><Check size={12} strokeWidth={3} className="text-ok" /> Asistió</span>
      <span className="flex items-center gap-1"><Clock size={12} className="text-aviso" /> Llegó tarde</span>
      <span className="flex items-center gap-1"><X size={12} strokeWidth={3} className="text-alerta" /> Faltó</span>
      <span>Toca a una cuidadora para cambiarla o marcar su asistencia.</span>
    </div>
  );
}
