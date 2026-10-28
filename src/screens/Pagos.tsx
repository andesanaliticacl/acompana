import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Download, MessageCircle, Undo2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Pago } from '../lib/types';
import { clp, diasEntre, fmtCorto, fmtDia, fmtHoras, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { descargarCSV, linkWhatsApp, resumenSemana } from '../lib/calculos';
import { vibrar } from '../lib/tacto';
import { Avatar, Boton, Card, MenuMas, Titulo, cx, inputCls, primerNombre } from '../components/ui';

export function Pagos() {
  const { db, upsert } = useStore();
  const h = hoy();
  const [lunes, setLunes] = useState(lunesDe(h));
  const [abierto, setAbierto] = useState<string | null>(null);
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
      <Titulo titulo="Pagos" />

      {/* Semana + Más */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setLunes(sumarDias(lunes, -7))} className="rounded-lg border border-linea bg-superficie p-2 hover:bg-fondo" aria-label="Semana anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center font-semibold">
          {fmtCorto(lunes)} – {fmtCorto(domingo)}
        </div>
        <button onClick={() => setLunes(sumarDias(lunes, 7))} className="rounded-lg border border-linea bg-superficie p-2 hover:bg-fondo" aria-label="Semana siguiente">
          <ChevronRight size={18} />
        </button>
        <MenuMas label="" items={[{ label: 'Descargar Excel', icon: <Download size={16} />, onClick: exportar }]} />
      </div>

      {/* 1. Lo que falta pagar */}
      <div data-tour="pagos-resumen" className="mb-4 rounded-xl border border-linea bg-superficie p-4">
        <div className="text-sm text-suave">Por pagar el {fmtDia(domingo).toLowerCase()}</div>
        <div className="text-3xl font-semibold tracking-tight text-primario tabular-nums">{clp(total - pagado)}</div>
        <div className="mt-1 text-sm text-suave">
          Total {clp(total)} · Pagado {clp(pagado)}
          {falta === 0 && <span className="font-medium text-tinta"> · Hoy es día de pago</span>}
        </div>
      </div>

      {/* 2. Una fila por cuidadora; el detalle se abre al tocarla */}
      <Card className="!p-0">
        {filas.length === 0 && <p className="px-4 py-8 text-center text-sm text-suave">No hay turnos esta semana.</p>}
        <ul className="divide-y divide-linea">
          {filas.map(({ c, r }) => {
            const monto = r.pagado ? r.pago!.monto : r.total;
            const abierta = abierto === c.id;
            return (
              <li key={c.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setAbierto(abierta ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="hidden sm:block"><Avatar c={c} size={38} /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium"><span className="sm:hidden">{primerNombre(c.nombre)}</span><span className="hidden sm:inline">{c.nombre}</span></span>
                      <span className="flex items-center gap-1 text-sm text-suave">
                        {fmtHoras(r.horas)}
                        {r.sinConfirmar > 0 && !r.pagado && <AlertTriangle size={13} className="text-aviso" />}
                        <ChevronDown size={14} className={cx('transition', abierta && 'rotate-180')} />
                      </span>
                    </span>
                  </button>
                  <span className="shrink-0 text-right font-semibold tabular-nums">{clp(monto)}</span>
                  {r.pagado ? (
                    <span className="inline-flex w-20 shrink-0 items-center justify-center gap-1 rounded-md bg-ok-50 py-1.5 text-xs font-medium text-ok">
                      <Check size={13} strokeWidth={3} /> Pagado
                    </span>
                  ) : (
                    <Boton chico className="w-20 shrink-0" onClick={() => { vibrar(12); guardarPago(c.id, { pagadoEl: h, monto: r.total }); }}>
                      Pagar
                    </Boton>
                  )}
                </div>

                {abierta && (
                  <div className="anim-entrar space-y-3 bg-fondo px-4 py-3 text-sm">
                    <div className="text-suave">
                      {r.turnos} turnos · {fmtHoras(r.horas)} × {clp(r.tarifa)} = {clp(r.subtotal)}
                      {r.faltas > 0 && <span className="text-alerta"> · {r.faltas} falta{r.faltas > 1 ? 's' : ''}</span>}
                      {r.atrasos > 0 && <span className="text-aviso"> · {r.atrasos} atraso{r.atrasos > 1 ? 's' : ''}</span>}
                    </div>
                    {r.sinConfirmar > 0 && !r.pagado && (
                      <div className="flex items-center gap-1.5 text-aviso">
                        <AlertTriangle size={14} /> {r.sinConfirmar} turno{r.sinConfirmar > 1 ? 's' : ''} sin marcar asistencia
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-suave">
                        Bono / descuento
                        <input
                          type="number"
                          step={1000}
                          disabled={r.pagado}
                          className={cx(inputCls, '!w-32 !py-1.5 text-right')}
                          value={r.ajuste || ''}
                          placeholder="0"
                          onChange={(e) => guardarPago(c.id, { ajuste: Number(e.target.value) || 0 })}
                        />
                      </label>
                      {r.pagado && (
                        <>
                          <a
                            href={linkWhatsApp(c.telefono, `Hola ${primerNombre(c.nombre)}, te transferí ${clp(r.pago!.monto)} por ${fmtHoras(r.horas)} de la semana ${fmtCorto(lunes)} al ${fmtCorto(domingo)}. ¡Gracias por tu trabajo!`)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Boton chico variante="suave">
                              <MessageCircle size={15} /> Avisarle
                            </Boton>
                          </a>
                          <Boton chico variante="fantasma" onClick={() => guardarPago(c.id, { pagadoEl: null, monto: 0 })}>
                            <Undo2 size={15} /> Deshacer pago
                          </Boton>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
