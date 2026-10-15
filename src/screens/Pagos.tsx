import { useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Download, MessageCircle, Undo2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Pago } from '../lib/types';
import { clp, diasEntre, fmtCorto, fmtDia, fmtHoras, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { descargarCSV, linkWhatsApp, resumenSemana } from '../lib/calculos';
import { Avatar, Boton, Card, Titulo, cx, inputCls, primerNombre } from '../components/ui';

export function Pagos() {
  const { db, upsert } = useStore();
  const h = hoy();
  const [lunes, setLunes] = useState(lunesDe(h));
  const domingo = sumarDias(lunes, 6);

  const filas = db.cuidadoras
    .map((c) => ({ c, r: resumenSemana(db, c.id, lunes) }))
    .filter((x) => x.r.turnos > 0 || x.r.pagado);
  const total = filas.reduce((s, x) => s + (x.r.pagado ? x.r.pago!.monto : x.r.total), 0);
  const pagado = filas.reduce((s, x) => s + (x.r.pagado ? x.r.pago!.monto : 0), 0);
  const horas = filas.reduce((s, x) => s + x.r.horas, 0);
  const falta = diasEntre(h, domingo);

  const guardarPago = (cid: string, p: Partial<Pago>) => {
    const r = resumenSemana(db, cid, lunes);
    const base: Pago = r.pago ?? { id: uid(), cuidadoraId: cid, semana: lunes, ajuste: 0, monto: 0, pagadoEl: null };
    upsert('pagos', { ...base, ...p });
  };

  const exportar = () => {
    const out: (string | number)[][] = [['Cuidadora', 'Horas', 'Valor hora', 'Subtotal', 'Bono/Descuento', 'Total', 'Estado', 'Pagado el']];
    for (const { c, r } of filas) {
      out.push([c.nombre, String(r.horas).replace('.', ','), r.tarifa, r.subtotal, r.ajuste, r.pagado ? r.pago!.monto : r.total, r.pagado ? 'Pagado' : 'Pendiente', r.pago?.pagadoEl ?? '']);
    }
    out.push(['TOTAL', String(horas).replace('.', ','), '', '', '', total, '', '']);
    descargarCSV(`pagos-semana-${lunes}.csv`, out);
  };

  return (
    <div>
      <Titulo titulo="Pagos" sub="Se paga cada domingo por las horas de lunes a domingo">
        <Boton variante="fantasma" chico onClick={exportar}>
          <Download size={16} /> Excel
        </Boton>
      </Titulo>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setLunes(sumarDias(lunes, -7))} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Semana anterior">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-center text-lg font-semibold">
          Semana {fmtCorto(lunes)} — {fmtCorto(domingo)}
        </div>
        <button onClick={() => setLunes(sumarDias(lunes, 7))} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Semana siguiente">
          <ChevronRight size={20} />
        </button>
      </div>

      <div data-tour="pagos-resumen" className="mb-5 rounded-xl border border-linea bg-white">
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-suave">Total de la semana</div>
            <div className="text-2xl font-semibold">{clp(total)}</div>
            <div className="text-sm text-suave">{fmtHoras(horas)} trabajadas</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-suave">Ya pagado</div>
            <div className="text-2xl font-semibold text-ok">{clp(pagado)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-suave">Por pagar · {fmtDia(domingo)}</div>
            <div className="text-2xl font-semibold text-primario">{clp(total - pagado)}</div>
            <div className="text-sm text-suave">
              {falta > 0 ? `en ${falta} día${falta > 1 ? 's' : ''} (estimado)` : falta === 0 ? '¡hoy es domingo de pago!' : 'semana cerrada'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filas.length === 0 && <Card><p className="text-suave">No hay turnos esta semana.</p></Card>}
        {filas.map(({ c, r }) => (
          <Card key={c.id} className={cx(r.pagado && 'bg-[#f6fcf9]')}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-48 flex-1 items-center gap-3">
                <Avatar c={c} size={44} />
                <div>
                  <div className="font-semibold">{c.nombre}</div>
                  <div className="text-sm text-suave">
                    {r.turnos} turnos · {fmtHoras(r.horas)} × {clp(r.tarifa)}
                    {r.faltas > 0 && <span className="text-primario"> · {r.faltas} falta{r.faltas > 1 ? 's' : ''}</span>}
                    {r.atrasos > 0 && <span className="text-aviso"> · {r.atrasos} atraso{r.atrasos > 1 ? 's' : ''}</span>}
                  </div>
                  {r.sinConfirmar > 0 && !r.pagado && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-aviso">
                      <AlertTriangle size={13} /> {r.sinConfirmar} turno{r.sinConfirmar > 1 ? 's' : ''} sin marcar asistencia
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-right text-xs font-semibold text-suave">
                  Bono / descuento
                  <input
                    type="number"
                    step={1000}
                    disabled={r.pagado}
                    className={cx(inputCls, 'mt-0.5 !w-32 !py-1.5 text-right')}
                    value={r.ajuste || ''}
                    placeholder="0"
                    onChange={(e) => guardarPago(c.id, { ajuste: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <div className="w-32 text-right">
                <div className="text-2xl font-semibold">{clp(r.pagado ? r.pago!.monto : r.total)}</div>
                {r.porVenir > 0 && !r.pagado && <div className="text-xs text-suave">incluye {fmtHoras(r.porVenir)} por venir</div>}
                {r.pagado && <div className="text-xs font-semibold text-ok">Pagado {fmtDia(r.pago!.pagadoEl!)}</div>}
              </div>

              <div className="flex gap-2">
                {r.pagado ? (
                  <>
                    <a
                      href={linkWhatsApp(c.telefono, `Hola ${primerNombre(c.nombre)}, te transferí ${clp(r.pago!.monto)} por ${fmtHoras(r.horas)} de la semana ${fmtCorto(lunes)} al ${fmtCorto(domingo)}. ¡Gracias por tu trabajo!`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Boton chico variante="suave" className="!bg-ok-50 !text-ok">
                        <MessageCircle size={16} /> Avisar
                      </Boton>
                    </a>
                    <Boton chico variante="fantasma" onClick={() => guardarPago(c.id, { pagadoEl: null, monto: 0 })} title="Deshacer pago">
                      <Undo2 size={16} />
                    </Boton>
                  </>
                ) : (
                  <Boton chico onClick={() => guardarPago(c.id, { pagadoEl: h, monto: r.total })}>
                    <Check size={16} /> Marcar pagado
                  </Boton>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
