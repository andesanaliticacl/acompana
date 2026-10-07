import { useState } from 'react';
import { AlertTriangle, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Copy, Download, Plus, Users, X } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion, Turno } from '../lib/types';
import { DIAS_CORTOS, diasSemana, fmtCorto, fmtDia, fmtHora, fmtHoras, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { asignacionesSemana, descargarCSV, horario, horasDe, huecos, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Card, Segmentado, Titulo, TurnoIcono, cx, primerNombre } from '../components/ui';
import { AsignarModal, type AsignarInicial } from '../components/AsignarModal';

type Vista = 'turno' | 'cuidadora';

const leerVista = (): Vista => {
  try {
    return localStorage.getItem('acompana-vista') === 'cuidadora' ? 'cuidadora' : 'turno';
  } catch {
    return 'turno';
  }
};

export function Semana() {
  const { db, upsertMuchos } = useStore();
  const h = hoy();
  const [lunes, setLunes] = useState(lunesDe(h));
  const [vista, setVistaState] = useState<Vista>(leerVista);
  const [modal, setModal] = useState<AsignarInicial | null>(null);
  const dias = diasSemana(lunes);
  const delaSemana = asignacionesSemana(db, lunes);
  const faltantes = huecos(db, lunes, 7).reduce((s, x) => s + x.faltan, 0);

  const setVista = (v: Vista) => {
    setVistaState(v);
    try { localStorage.setItem('acompana-vista', v); } catch { /* ignorar */ }
  };

  const copiarAnterior = () => {
    const ant = asignacionesSemana(db, sumarDias(lunes, -7));
    const nuevas: Asignacion[] = [];
    for (const a of ant) {
      const fecha = sumarDias(a.fecha, 7);
      const yaEsta = delaSemana.some((x) => x.fecha === fecha && x.cuidadoraId === a.cuidadoraId);
      if (yaEsta) continue;
      const t = db.turnos.find((x) => x.id === a.turnoId);
      const normal = t && horario(t, a.fecha);
      const horas = t && normal && normal.inicio === a.inicio && normal.fin === a.fin ? horario(t, fecha) : { inicio: a.inicio, fin: a.fin };
      nuevas.push({ ...a, ...horas, id: uid(), fecha, estado: 'programado', nota: '' });
    }
    if (!nuevas.length) return alert('No hay nada que copiar: esta semana ya tiene a las mismas cuidadoras.');
    if (confirm(`Se copiarán ${nuevas.length} asignaciones de la semana anterior. ¿Continuar?`)) upsertMuchos('asignaciones', nuevas);
  };

  const exportar = () => {
    const filas: (string | number)[][] = [['Fecha', 'Turno', 'Cuidadora', 'Desde', 'Hasta', 'Horas', 'Estado', 'Nota']];
    for (const a of [...delaSemana].sort((x, y) => (x.fecha + x.inicio).localeCompare(y.fecha + y.inicio))) {
      filas.push([
        a.fecha, db.turnos.find((t) => t.id === a.turnoId)?.nombre ?? '', db.cuidadoras.find((c) => c.id === a.cuidadoraId)?.nombre ?? '',
        a.inicio, a.fin, String(horasDe(a)).replace('.', ','), a.estado, a.nota ?? '',
      ]);
    }
    descargarCSV(`turnos-semana-${lunes}.csv`, filas);
  };

  return (
    <div>
      <Titulo
        titulo="Calendario"
        sub={faltantes ? <span className="text-alerta">Faltan {faltantes} cuidadora{faltantes > 1 ? 's' : ''} para completar la semana</span> : 'Semana completa'}
      >
        <Boton variante="suave" chico onClick={copiarAnterior}>
          <Copy size={15} /> Copiar semana anterior
        </Boton>
        <Boton variante="suave" chico onClick={exportar}>
          <Download size={15} /> Excel
        </Boton>
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <button onClick={() => setLunes(sumarDias(lunes, -7))} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-40 text-center font-semibold">
            {fmtCorto(dias[0])} – {fmtCorto(dias[6])}
          </div>
          <button onClick={() => setLunes(sumarDias(lunes, 7))} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
          {lunes !== lunesDe(h) && (
            <Boton chico variante="fantasma" onClick={() => setLunes(lunesDe(h))}>
              Esta semana
            </Boton>
          )}
        </div>
        <Segmentado<Vista>
          valor={vista}
          onChange={setVista}
          opciones={[
            { id: 'turno', label: <><CalendarRange size={15} /> Por turno</> },
            { id: 'cuidadora', label: <><Users size={15} /> Por cuidadora</> },
          ]}
        />
      </div>

      {vista === 'turno' ? (
        <VistaTurnos dias={dias} delaSemana={delaSemana} onModal={setModal} />
      ) : (
        <VistaCuidadoras dias={dias} lunes={lunes} delaSemana={delaSemana} onModal={setModal} />
      )}

      <Leyenda />
      {modal && <AsignarModal inicial={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ───────────── Vista "Por turno": cada celda = un turno de un día, con su cobertura ───────────── */

function VistaTurnos({ dias, delaSemana, onModal }: { dias: string[]; delaSemana: Asignacion[]; onModal: (i: AsignarInicial) => void }) {
  const { db } = useStore();
  const h = hoy();
  const enCelda = (fecha: string, turnoId: string) =>
    delaSemana.filter((a) => a.fecha === fecha && a.turnoId === turnoId).sort((a, b) => Number(a.estado === 'falto') - Number(b.estado === 'falto'));

  return (
    <>
      {/* Computador: grilla */}
      <div className="hidden overflow-hidden rounded-xl border border-linea bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:block">
        <div className="grid grid-cols-[124px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-linea bg-fondo" />
          {dias.map((d, i) => (
            <div key={d} className={cx('border-b border-l border-linea px-2 py-2 text-center', d === h ? 'bg-primario-50' : 'bg-fondo')}>
              <div className="text-[11px] font-medium tracking-wide text-suave uppercase">{DIAS_CORTOS[i]}</div>
              <div className={cx('text-lg font-semibold', d === h && 'text-primario')}>{Number(d.slice(8))}</div>
            </div>
          ))}
          {db.turnos.map((t) => [
            <CabeceraTurno key={t.id} t={t} />,
            ...dias.map((d) => (
              <CeldaTurno key={t.id + d} t={t} fecha={d} lista={enCelda(d, t.id)} esHoy={d === h} onModal={onModal} />
            )),
          ])}
        </div>
      </div>

      {/* Celular: un día por tarjeta */}
      <div className="space-y-3 lg:hidden">
        {dias.map((d) => (
          <Card key={d} className={cx('!p-0', d === h && 'ring-2 ring-primario/30')}>
            <div className="flex items-center justify-between border-b border-linea px-4 py-2.5">
              <span className="font-semibold">{fmtDia(d)}</span>
              {d === h && <span className="rounded-md bg-primario-50 px-2 py-0.5 text-xs font-medium text-primario">Hoy</span>}
            </div>
            <div className="divide-y divide-linea">
              {db.turnos.map((t) => {
                const lista = enCelda(d, t.id);
                const hor = horario(t, d);
                return (
                  <div key={t.id} className="px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="grid size-6 place-items-center rounded-md" style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}>
                          <TurnoIcono icono={t.icono} size={14} />
                        </span>
                        <span className="font-medium">{t.nombre}</span>
                        <span className="text-suave">{fmtHora(hor.inicio)}–{fmtHora(hor.fin)}</span>
                      </div>
                      <Cobertura hay={lista.filter((a) => a.estado !== 'falto').length} req={t.requeridas} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lista.map((a) => <Persona key={a.id} a={a} onClick={() => onModal({ fecha: d, id: a.id })} />)}
                      <button
                        onClick={() => onModal({ fecha: d, turnoId: t.id })}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#c5cad3] px-2 py-1 text-xs font-medium text-suave hover:bg-fondo"
                      >
                        <Plus size={13} /> Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function CabeceraTurno({ t }: { t: Turno }) {
  const col = PALETA[t.color];
  const ex = t.excepcion;
  return (
    <div className="flex flex-col justify-start gap-1 border-b border-linea px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md" style={{ background: col.bg, color: col.fg }}>
          <TurnoIcono icono={t.icono} size={15} />
        </span>
        <span className="font-semibold">{t.nombre}</span>
      </div>
      <div className="text-xs text-suave">{fmtHora(t.inicio)}–{fmtHora(t.fin)} h</div>
      {ex && <div className="text-xs text-suave">{DIAS_CORTOS[ex.dia]}: {fmtHora(ex.inicio)}–{fmtHora(ex.fin)} h</div>}
      <div className="mt-1 flex items-center gap-1 text-xs text-suave">
        <Users size={12} /> {t.requeridas} por turno
      </div>
    </div>
  );
}

function CeldaTurno({ t, fecha, lista, esHoy, onModal }: { t: Turno; fecha: string; lista: Asignacion[]; esHoy: boolean; onModal: (i: AsignarInicial) => void }) {
  const hay = lista.filter((a) => a.estado !== 'falto').length;
  const falta = Math.max(0, t.requeridas - hay);
  const hor = horario(t, fecha);
  const especial = hor.inicio !== t.inicio || hor.fin !== t.fin;
  return (
    <div className={cx('group flex min-h-[150px] flex-col gap-1 border-b border-l border-linea p-1.5', esHoy && 'bg-primario-50/50')}>
      <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5 px-0.5 pb-0.5">
        <Cobertura hay={hay} req={t.requeridas} />
        {especial && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-aviso" title="Horario especial">
            <Clock size={11} /> {fmtHora(hor.inicio)}–{fmtHora(hor.fin)}
          </span>
        )}
      </div>
      {lista.map((a) => <Persona key={a.id} a={a} completa onClick={() => onModal({ fecha, id: a.id })} />)}
      <button
        onClick={() => onModal({ fecha, turnoId: t.id })}
        className={cx(
          'mt-auto flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition',
          falta ? 'border border-dashed border-alerta-200 bg-alerta-50 text-alerta hover:bg-[#fbe9e7]' : 'text-suave opacity-0 group-hover:opacity-100 hover:bg-fondo',
        )}
      >
        <Plus size={13} /> {falta ? `Falta${falta > 1 ? 'n' : ''} ${falta}` : 'Agregar'}
      </button>
    </div>
  );
}

function Cobertura({ hay, req }: { hay: number; req: number }) {
  const ok = hay >= req;
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', ok ? 'bg-ok-50 text-ok' : 'bg-alerta-50 text-alerta')}
      title={`${hay} de ${req} cuidadoras`}
    >
      {ok ? <Check size={11} strokeWidth={3} /> : <AlertTriangle size={11} />} {hay}/{req}
    </span>
  );
}

function Persona({ a, onClick, completa }: { a: Asignacion; onClick: () => void; completa?: boolean }) {
  const { db } = useStore();
  const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
  const t = db.turnos.find((x) => x.id === a.turnoId);
  if (!c) return null;
  const normal = t ? horario(t, a.fecha) : null;
  const distinto = normal && (normal.inicio !== a.inicio || normal.fin !== a.fin);
  return (
    <button
      onClick={onClick}
      title={`${c.nombre} · ${a.inicio}–${a.fin}${a.nota ? ` · ${a.nota}` : ''}`}
      className={cx(
        'flex items-center gap-1.5 rounded-md border px-1 py-0.5 text-left text-xs transition hover:border-linea hover:bg-fondo',
        completa ? 'w-full border-transparent' : 'border-linea bg-white',
        a.estado === 'falto' && 'opacity-55',
      )}
    >
      {completa ? <span className="size-2 shrink-0 rounded-full" style={{ background: PALETA[c.color].dot }} /> : <Avatar c={c} size={20} />}
      <span className={cx('min-w-0 flex-1 truncate font-medium', a.estado === 'falto' && 'line-through')}>{completa ? c.nombre.split(" ")[0] : primerNombre(c.nombre)}</span>
      {distinto && <span className="text-[10px] text-aviso">{fmtHora(a.inicio)}–{fmtHora(a.fin)}</span>}
      <IconoEstado estado={a.estado} />
    </button>
  );
}

function IconoEstado({ estado }: { estado: Asignacion['estado'] }) {
  if (estado === 'asistio') return <Check size={12} strokeWidth={3} className="shrink-0 text-ok" />;
  if (estado === 'atraso') return <Clock size={12} strokeWidth={2.5} className="shrink-0 text-aviso" />;
  if (estado === 'falto') return <X size={12} strokeWidth={3} className="shrink-0 text-alerta" />;
  return null;
}

/* ───────────── Vista "Por cuidadora": una fila por persona, como planilla de turnos ───────────── */

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
                  return (
                    <td key={d} className={cx('border-b border-l border-linea p-1 text-center', d === h && 'bg-primario-50/50')}>
                      {a && t ? (
                        <button
                          onClick={() => onModal({ fecha: d, id: a.id })}
                          className={cx('flex w-full items-center justify-center gap-1 rounded-md px-1 py-1.5 text-xs font-semibold transition hover:brightness-95', a.estado === 'falto' && 'line-through opacity-60')}
                          style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}
                          title={`${t.nombre} ${a.inicio}–${a.fin}${a.nota ? ` · ${a.nota}` : ''}`}
                        >
                          <TurnoIcono icono={t.icono} size={12} />
                          <span>{t.nombre}</span>
                          <IconoEstado estado={a.estado} />
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
                      <button onClick={() => onModal({ fecha: d, turnoId: t.id })} title="Asignar a este turno">
                        <Cobertura hay={hay} req={t.requeridas} />
                      </button>
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
  );
}

function Leyenda() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
      <span className="flex items-center gap-1"><Check size={12} strokeWidth={3} className="text-ok" /> Asistió</span>
      <span className="flex items-center gap-1"><Clock size={12} className="text-aviso" /> Llegó tarde</span>
      <span className="flex items-center gap-1"><X size={12} strokeWidth={3} className="text-alerta" /> Faltó</span>
      <span>Sin ícono = programado</span>
    </div>
  );
}
