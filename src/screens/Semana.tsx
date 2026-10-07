import { useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Download, Plus, Search, Users, X } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Persona, Turno } from '../lib/types';
import { ESTADOS } from '../lib/types';
import { DIAS_CORTOS, diasSemana, fmtCorto, fmtDia, fmtHora, fmtHoras, fmtLargo, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { asignacionesSemana, clienteDe, descargarCSV, horario, horasDe, huecos, personaDe, personasActivas, pisoDe, requeridasPersona, requeridasTurno, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Segmentado, Titulo, TurnoIcono, cx, inputCls, primerNombre } from '../components/ui';
import { AsignarModal, type AsignarInicial } from '../components/AsignarModal';

type Vista = 'dia' | 'cuidadora';

const leerVista = (): Vista => {
  try {
    return localStorage.getItem('acompana-vista') === 'cuidadora' ? 'cuidadora' : 'dia';
  } catch {
    return 'dia';
  }
};

export function Semana({ param }: { param?: string }) {
  const { db, upsertMuchos } = useStore();
  const h = hoy();
  // param: una fecha (YYYY-MM-DD) o un texto para buscar en el día
  const esFecha = !!param && /^\d{4}-\d{2}-\d{2}$/.test(param);
  const [fecha, setFecha] = useState(esFecha ? param! : h);
  const [filtro, setFiltro] = useState(param && !esFecha ? param : '');
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
    const filas: (string | number)[][] = [['Fecha', 'Turno', 'Piso', 'Residente', 'Cliente', 'Cuidadora', 'Desde', 'Hasta', 'Horas', 'Estado', 'Nota']];
    for (const a of [...delaSemana].sort((x, y) => (x.fecha + x.inicio).localeCompare(y.fecha + y.inicio))) {
      filas.push([
        a.fecha, db.turnos.find((t) => t.id === a.turnoId)?.nombre ?? '',
        db.pisos.find((p) => p.id === pisoDe(db, a))?.nombre ?? '', personaDe(db, a)?.nombre ?? '', clienteDe(db, a)?.nombre ?? '',
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
        <VistaDia fecha={fecha} filtro={filtro} onFiltro={setFiltro} onModal={setModal} />
      ) : (
        <VistaCuidadoras dias={dias} lunes={lunes} delaSemana={delaSemana} onModal={setModal} />
      )}

      {modal && <AsignarModal inicial={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ───────────── Vista día a día: una tabla, residentes en filas y turnos en columnas ───────────── */

type Agrupar = 'piso' | 'cliente';

const leerAgrupar = (): Agrupar => {
  try {
    return localStorage.getItem('acompana-agrupar') === 'cliente' ? 'cliente' : 'piso';
  } catch {
    return 'piso';
  }
};

function VistaDia({ fecha, filtro, onFiltro, onModal }: { fecha: string; filtro: string; onFiltro: (v: string) => void; onModal: (i: AsignarInicial) => void }) {
  const { db } = useStore();
  const [agrupar, setAgruparState] = useState<Agrupar>(leerAgrupar);
  const setAgrupar = (v: Agrupar) => {
    setAgruparState(v);
    try { localStorage.setItem('acompana-agrupar', v); } catch { /* ignorar */ }
  };
  const delDia = db.asignaciones.filter((a) => a.fecha === fecha);
  const turnos = db.turnos;
  const nombreCuidadora = (a: Asignacion) => db.cuidadoras.find((c) => c.id === a.cuidadoraId)?.nombre ?? '';

  // Residentes que tienen algo ese día, filtrados por el buscador
  const q = filtro.trim().toLowerCase();
  const coincide = (...textos: (string | undefined)[]) => !q || textos.some((s) => s?.toLowerCase().includes(q));
  const residentes = personasActivas(db)
    .filter((p) => turnos.some((t) => requeridasPersona(p, t.id) > 0) || delDia.some((a) => a.personaId === p.id))
    .filter((p) =>
      coincide(p.nombre, db.clientes.find((c) => c.id === p.clienteId)?.nombre, ...delDia.filter((a) => a.personaId === p.id).map(nombreCuidadora)),
    );
  const sueltas = delDia.filter((a) => !db.personas.some((p) => p.id === a.personaId) && coincide(nombreCuidadora(a)));

  const grupos =
    agrupar === 'piso'
      ? [...db.pisos, { id: '', nombre: 'Sin piso' }].map((pi) => ({ id: pi.id || 'sin', titulo: pi.nombre, rs: residentes.filter((p) => (p.pisoId ?? '') === pi.id) }))
      : [
          ...[...db.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => ({ id: c.id, titulo: c.nombre, rs: residentes.filter((p) => p.clienteId === c.id) })),
          { id: 'sin', titulo: 'Sin cliente', rs: residentes.filter((p) => !db.clientes.some((c) => c.id === p.clienteId)) },
        ];
  const columnas = `minmax(0,1.1fr) repeat(${turnos.length}, minmax(0,1fr))`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{fmtLargo(fecha)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {turnos.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-sm text-suave">
              <TurnoIcono icono={t.icono} size={15} /> {t.nombre}
              <Cobertura hay={delDia.filter((a) => a.turnoId === t.id && a.estado !== 'falto').length} req={requeridasTurno(db, t)} />
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-suave" />
          <input className={cx(inputCls, '!py-2 pl-9')} placeholder="Buscar residente, cliente o cuidadora…" value={filtro} onChange={(e) => onFiltro(e.target.value)} />
          {filtro && (
            <button onClick={() => onFiltro('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-suave hover:bg-fondo" aria-label="Limpiar búsqueda">
              <X size={15} />
            </button>
          )}
        </div>
        {db.personas.length > 0 && (
          <Segmentado<Agrupar>
            valor={agrupar}
            onChange={setAgrupar}
            opciones={[
              { id: 'piso', label: <><Building2 size={15} /> Por piso</> },
              { id: 'cliente', label: <><Users size={15} /> Por cliente</> },
            ]}
          />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        {/* Encabezado: Residente | Día | Noche */}
        <div className="grid border-b border-linea" style={{ gridTemplateColumns: columnas }}>
          <div className="px-3 py-2.5 text-xs font-medium text-suave">Residente</div>
          {turnos.map((t) => {
            const hor = horario(t, fecha);
            return (
              <div key={t.id} className="border-l border-linea px-3 py-2" style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}>
                <div className="flex items-center gap-1.5 text-sm font-semibold"><TurnoIcono icono={t.icono} size={15} /> {t.nombre}</div>
                <div className="text-xs">{fmtHora(hor.inicio)}–{fmtHora(hor.fin)} h</div>
              </div>
            );
          })}
        </div>

        {grupos.filter((g) => g.rs.length).map((g) => (
          <div key={g.id}>
            <div className="border-b border-linea bg-fondo px-3 py-1.5 text-xs font-semibold tracking-wide text-suave uppercase">{g.titulo}</div>
            {g.rs.map((p) => (
              <div key={p.id} className="grid border-b border-linea last:border-b-0" style={{ gridTemplateColumns: columnas }}>
                <div className="flex items-center px-3 py-2 text-sm font-medium">
                  <span className="truncate" title={p.nombre}>{p.nombre}</span>
                </div>
                {turnos.map((t) => (
                  <CeldaResidente key={t.id} p={p} t={t} fecha={fecha} items={delDia.filter((a) => a.personaId === p.id && a.turnoId === t.id)} onModal={onModal} />
                ))}
              </div>
            ))}
          </div>
        ))}

        {sueltas.length > 0 && (
          <div>
            <div className="border-b border-linea bg-fondo px-3 py-1.5 text-xs font-semibold tracking-wide text-suave uppercase">Sin residente</div>
            <div className="grid" style={{ gridTemplateColumns: columnas }}>
              <div className="px-3 py-2 text-sm text-suave">—</div>
              {turnos.map((t) => (
                <div key={t.id} className="space-y-1 border-l border-linea p-1.5">
                  {sueltas.filter((a) => a.turnoId === t.id).map((a) => <ChipCuidadora key={a.id} a={a} onClick={() => onModal({ fecha, id: a.id })} />)}
                </div>
              ))}
            </div>
          </div>
        )}

        {residentes.length === 0 && sueltas.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-suave">{q ? `Nada coincide con “${filtro}” este día.` : 'No hay residentes registrados.'}</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Leyenda />
        <Boton chico variante="suave" onClick={() => onModal({ fecha })}>
          <Plus size={15} /> Asignar turno
        </Boton>
      </div>
    </div>
  );
}

/** Celda Residente × Turno: sus cuidadoras, "Asignar" si falta, o "—" si ese turno no aplica. */
function CeldaResidente({ p, t, fecha, items, onModal }: { p: Persona; t: Turno; fecha: string; items: Asignacion[]; onModal: (i: AsignarInicial) => void }) {
  const req = requeridasPersona(p, t.id);
  const libres = Math.max(0, req - items.filter((a) => a.estado !== 'falto').length);
  return (
    <div className="group space-y-1 border-l border-linea p-1.5">
      {items.map((a) => <ChipCuidadora key={a.id} a={a} onClick={() => onModal({ fecha, id: a.id })} />)}
      {Array.from({ length: libres }, (_, i) => (
        <button
          key={i}
          onClick={() => onModal({ fecha, turnoId: t.id, personaId: p.id })}
          className="flex w-full items-center gap-1 rounded-md border border-dashed border-alerta-200 bg-alerta-50 px-2 py-1.5 text-xs font-medium text-alerta hover:bg-[#fbe9e7]"
        >
          <Plus size={13} /> Asignar
        </button>
      ))}
      {req === 0 && items.length === 0 && (
        <button
          onClick={() => onModal({ fecha, turnoId: t.id, personaId: p.id })}
          className="flex w-full items-center rounded-md px-2 py-1.5 text-xs text-[#c4c9d1] hover:bg-fondo hover:text-suave"
          title="Este turno no lo necesita. Toca para asignar igual."
        >
          —
        </button>
      )}
    </div>
  );
}

function ChipCuidadora({ a, onClick }: { a: Asignacion; onClick: () => void }) {
  const { db } = useStore();
  const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
  if (!c) return null;
  return (
    <button onClick={onClick} title={`${c.nombre} · ${a.inicio}–${a.fin}`} className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-fondo">
      <span className="hidden sm:block"><Avatar c={c} size={24} /></span>
      <span className={cx('min-w-0 flex-1 truncate text-sm', a.estado === 'falto' && 'text-suave line-through')}>
        <span className="sm:hidden">{primerNombre(c.nombre)}</span>
        <span className="hidden sm:inline">{c.nombre}</span>
      </span>
      <IconoEstado estado={a.estado} />
    </button>
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
                    const k = a && personaDe(db, a);
                    const pi = a && db.pisos.find((x) => x.id === pisoDe(db, a));
                    const p = k || pi ? { nombre: [k?.nombre.split(' ')[0], pi?.nombre.replace('Piso ', 'P')].filter(Boolean).join(' · ') } : undefined;
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
