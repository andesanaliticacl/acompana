import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Plus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Asignacion } from '../lib/types';
import { DIAS_CORTOS, diasSemana, fmtCorto, fmtDia, fmtHora, fmtHoras, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { asignacionesSemana, descargarCSV, horasDe, huecos, resumenSemana } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Avatar, Boton, Card, Titulo, cx, primerNombre } from '../components/ui';
import { AsignarModal, type AsignarInicial } from '../components/AsignarModal';

export function Semana() {
  const { db, upsertMuchos } = useStore();
  const h = hoy();
  const [lunes, setLunes] = useState(lunesDe(h));
  const [modal, setModal] = useState<AsignarInicial | null>(null);
  const dias = diasSemana(lunes);
  const delaSemana = asignacionesSemana(db, lunes);
  const vacios = huecos(db, lunes, 7).length;

  const copiarAnterior = () => {
    const ant = asignacionesSemana(db, sumarDias(lunes, -7));
    const nuevas: Asignacion[] = [];
    for (const a of ant) {
      const fecha = sumarDias(a.fecha, 7);
      const ocupado = delaSemana.some((x) => x.fecha === fecha && x.turnoId === a.turnoId);
      if (!ocupado) nuevas.push({ ...a, id: uid(), fecha, estado: 'programado', nota: '' });
    }
    if (!nuevas.length) return alert('No hay turnos vacíos que copiar: esta semana ya está armada.');
    if (confirm(`Se copiarán ${nuevas.length} turnos de la semana anterior en los espacios vacíos. ¿Seguir?`)) upsertMuchos('asignaciones', nuevas);
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

  const enCelda = (fecha: string, turnoId: string) => delaSemana.filter((a) => a.fecha === fecha && a.turnoId === turnoId);
  const resumen = db.cuidadoras
    .map((c) => ({ c, r: resumenSemana(db, c.id, lunes) }))
    .filter((x) => x.r.turnos > 0)
    .sort((a, b) => b.r.horas - a.r.horas);
  const maxHoras = Math.max(1, ...resumen.map((x) => x.r.horas));

  return (
    <div>
      <Titulo titulo="Calendario" sub={vacios ? `${vacios} turno${vacios > 1 ? 's' : ''} sin cubrir esta semana` : 'Semana completa ✨'}>
        <Boton variante="fantasma" chico onClick={copiarAnterior}>
          <Copy size={16} /> Copiar semana anterior
        </Boton>
        <Boton variante="fantasma" chico onClick={exportar}>
          <Download size={16} /> Excel
        </Boton>
      </Titulo>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setLunes(sumarDias(lunes, -7))} className="rounded-full bg-white p-2.5 shadow-sm hover:bg-rosa" aria-label="Semana anterior">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-center font-display text-lg font-semibold">
          {fmtCorto(dias[0])} — {fmtCorto(dias[6])}
        </div>
        <button onClick={() => setLunes(sumarDias(lunes, 7))} className="rounded-full bg-white p-2.5 shadow-sm hover:bg-rosa" aria-label="Semana siguiente">
          <ChevronRight size={20} />
        </button>
        {lunes !== lunesDe(h) && (
          <Boton chico variante="suave" onClick={() => setLunes(lunesDe(h))}>
            Hoy
          </Boton>
        )}
      </div>

      {/* Escritorio: grilla turnos x días */}
      <div className="hidden overflow-hidden rounded-3xl border border-linea bg-white lg:block">
        <div className="grid grid-cols-[130px_repeat(7,minmax(0,1fr))]">
          <div className="dalmata-suave border-b border-linea" />
          {dias.map((d, i) => (
            <div key={d} className={cx('border-b border-l border-linea px-2 py-2.5 text-center', d === h && 'bg-rosa')}>
              <div className="text-xs font-bold uppercase text-suave">{DIAS_CORTOS[i]}</div>
              <div className={cx('font-display text-lg font-semibold', d === h && 'text-rosa-fg')}>{Number(d.slice(8))}</div>
            </div>
          ))}
          {db.turnos.map((t) => {
            const col = PALETA[t.color];
            return [
              <div key={t.id} className="flex flex-col justify-center border-b border-linea px-3 py-3" style={{ background: col.bg, color: col.fg }}>
                <div className="font-display text-base font-semibold">{t.emoji} {t.nombre}</div>
                <div className="text-xs font-bold opacity-80">{fmtHora(t.inicio)}–{fmtHora(t.fin)} h</div>
              </div>,
              ...dias.map((d) => (
                <Celda key={t.id + d} lista={enCelda(d, t.id)} esHoy={d === h} pasado={d < h} color={t.color} onNueva={() => setModal({ fecha: d, turnoId: t.id })} onEditar={(id) => setModal({ fecha: d, id })} />
              )),
            ];
          })}
        </div>
      </div>

      {/* Celular: un día por tarjeta */}
      <div className="space-y-3 lg:hidden">
        {dias.map((d) => (
          <Card key={d} className={cx('!p-3', d === h && 'ring-2 ring-rosa-2')}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-display text-lg font-semibold">{fmtDia(d)}</span>
              {d === h && <span className="rounded-full bg-rosa px-2 py-0.5 text-xs font-bold text-rosa-fg">Hoy</span>}
            </div>
            <div className="space-y-1.5">
              {db.turnos.map((t) => {
                const lista = enCelda(d, t.id);
                const col = PALETA[t.color];
                return (
                  <div key={t.id} className="flex items-stretch gap-2">
                    <div className="flex w-20 shrink-0 flex-col justify-center rounded-xl px-2 py-1.5 text-xs font-bold" style={{ background: col.bg, color: col.fg }}>
                      <span>{t.emoji} {t.nombre}</span>
                    </div>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {lista.map((a) => (
                        <Chip key={a.id} a={a} onClick={() => setModal({ fecha: d, id: a.id })} />
                      ))}
                      {lista.length === 0 ? (
                        <button onClick={() => setModal({ fecha: d, turnoId: t.id })} className="flex-1 rounded-xl border-2 border-dashed border-rosa-2 py-1.5 text-xs font-bold text-rosa-fg">
                          Sin cubrir +
                        </button>
                      ) : (
                        <button onClick={() => setModal({ fecha: d, turnoId: t.id })} className="rounded-xl px-2 text-suave hover:bg-rosa" aria-label="Agregar otra persona">
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 text-xl font-semibold">Horas de la semana por cuidadora</h2>
        {resumen.length === 0 && <p className="text-suave">Aún no hay turnos esta semana.</p>}
        <div className="space-y-2.5">
          {resumen.map(({ c, r }) => (
            <div key={c.id} className="flex items-center gap-3">
              <Avatar c={c} size={32} />
              <div className="w-28 shrink-0 truncate text-sm font-bold sm:w-36">{primerNombre(c.nombre)}</div>
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-[#f6f1f3]">
                <div className="flex h-full">
                  <div style={{ width: `${(r.hechas / maxHoras) * 100}%`, background: PALETA[c.color].dot }} />
                  <div style={{ width: `${(r.porVenir / maxHoras) * 100}%`, background: PALETA[c.color].bg }} />
                </div>
              </div>
              <div className="w-14 text-right text-sm font-bold">{fmtHoras(r.horas)}</div>
            </div>
          ))}
        </div>
        {resumen.length > 0 && <p className="mt-3 text-xs text-suave">Color fuerte = horas ya hechas · color claro = horas por venir</p>}
      </Card>

      {modal && <AsignarModal inicial={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function Chip({ a, onClick, full }: { a: Asignacion; onClick: () => void; full?: boolean }) {
  const { db } = useStore();
  const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
  const t = db.turnos.find((x) => x.id === a.turnoId);
  if (!c) return null;
  const col = PALETA[c.color];
  const horario = t && (t.inicio !== a.inicio || t.fin !== a.fin) ? `${fmtHora(a.inicio)}–${fmtHora(a.fin)}` : null;
  const icono = a.estado === 'asistio' ? '✓' : a.estado === 'atraso' ? '⏰' : a.estado === 'falto' ? '✗' : '';
  return (
    <button
      onClick={onClick}
      title={`${c.nombre} · ${a.inicio}–${a.fin}`}
      className={cx('flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs font-bold transition hover:brightness-95', full && 'w-full', a.estado === 'falto' && 'opacity-50')}
      style={{ background: col.bg, color: col.fg }}
    >
      <Avatar c={c} size={22} />
      <span className={cx('min-w-0 flex-1 leading-tight', a.estado === 'falto' && 'line-through')}>
        <span className="line-clamp-2 block break-words">{primerNombre(c.nombre)}</span>
        {horario && <span className="block font-semibold opacity-80">{horario}</span>}
      </span>
      {icono && <span>{icono}</span>}
    </button>
  );
}

function Celda({ lista, esHoy, pasado, color, onNueva, onEditar }: { lista: Asignacion[]; esHoy: boolean; pasado: boolean; color: keyof typeof PALETA; onNueva: () => void; onEditar: (id: string) => void }) {
  const cubierta = lista.some((a) => a.estado !== 'falto');
  return (
    <div className={cx('group flex min-h-[86px] flex-col gap-1 border-b border-l border-linea p-1.5', esHoy && 'bg-rosa/40', pasado && !esHoy && 'bg-[#fcfafb]')}>
      {lista.map((a) => (
        <Chip key={a.id} a={a} full onClick={() => onEditar(a.id)} />
      ))}
      {!cubierta ? (
        <button
          onClick={onNueva}
          className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold transition hover:bg-rosa"
          style={{ borderColor: PALETA.rosa.dot, color: PALETA.rosa.fg }}
        >
          Sin cubrir
        </button>
      ) : (
        <button onClick={onNueva} className="mt-auto rounded-lg py-0.5 text-suave opacity-0 transition group-hover:opacity-100 hover:bg-rosa" aria-label="Agregar" style={{ color: PALETA[color].fg }}>
          <Plus size={14} className="mx-auto" />
        </button>
      )}
    </div>
  );
}
