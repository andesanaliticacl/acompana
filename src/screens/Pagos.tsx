import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Download, MessageCircle, Undo2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { FormaPago, Pago } from '../lib/types';
import { FORMAS_PAGO, nombreArea, textoForma } from '../lib/types';
import { clp, fmtDia, fmtHoras, fmtPeriodo, hoy, moverQuincena, quincenaDe, sumarDias, uid } from '../lib/fechas';
import { descargarCSV, linkWhatsApp, nombreSede, resumenPeriodo } from '../lib/calculos';
import { vibrar } from '../lib/tacto';
import { Avatar, Boton, Card, MenuMas, Modal, Segmentado, Titulo, cx, inputCls, primerNombre } from '../components/ui';

type Modo = 'quincena' | 'diario';

/** Se paga por turno más horas extra: quincenal, y día a día para el personal de emergencia. */
export function Pagos() {
  const { db, upsert } = useStore();
  const h = hoy();
  const [modo, setModo] = useState<Modo>('quincena');
  const [quincena, setQuincena] = useState(quincenaDe(h).desde);
  const [dia, setDia] = useState(h);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);

  const q = quincenaDe(quincena);
  const desde = modo === 'quincena' ? q.desde : dia;
  const hasta = modo === 'quincena' ? q.hasta : dia;
  const clave = modo === 'quincena' ? q.clave : `d:${dia}`;
  const mover = (n: number) => (modo === 'quincena' ? setQuincena(moverQuincena(quincena, n)) : setDia(sumarDias(dia, n)));

  const filas = db.cuidadoras
    .filter((c) => (modo === 'diario' ? c.emergencia : !c.emergencia))
    .map((c) => ({ c, r: resumenPeriodo(db, c.id, desde, hasta, clave) }))
    .filter((x) => x.r.turnos > 0 || x.r.pagado)
    .sort((a, b) => (nombreSede(db, a.c.sedeId) ?? '').localeCompare(nombreSede(db, b.c.sedeId) ?? '') || a.c.nombre.localeCompare(b.c.nombre));
  const monto = (r: (typeof filas)[number]['r']) => (r.pagado ? r.pago!.monto : r.total);
  const total = filas.reduce((s, x) => s + monto(x.r), 0);
  const pagado = filas.reduce((s, x) => s + (x.r.pagado ? x.r.pago!.monto : 0), 0);
  const fila = filas.find((x) => x.c.id === pagando && !x.r.pagado);

  const guardarPago = (cid: string, p: Partial<Pago>) => {
    const r = resumenPeriodo(db, cid, desde, hasta, clave);
    const base: Pago = r.pago ?? { id: uid(), cuidadoraId: cid, periodo: clave, ajuste: 0, monto: 0, pagadoEl: null };
    upsert('pagos', { ...base, ...p });
  };

  const exportar = () => {
    const out: (string | number)[][] = [['Sede', 'Área', 'Personal', 'Turnos', 'Valor turno', 'Horas extra', 'Valor hora extra', 'Subtotal', 'Bono/Descuento', 'Total', 'Estado', 'Forma de pago', 'Pagado el']];
    for (const { c, r } of filas) {
      out.push([
        nombreSede(db, c.sedeId) ?? 'Todas', nombreArea(c.area), c.nombre, r.pagables, r.valor, String(r.horasExtra).replace('.', ','), r.valorExtra,
        r.subtotal, r.ajuste, monto(r), r.pagado ? 'Pagado' : 'Pendiente', r.pagado ? textoForma(r.pago!) : '', r.pago?.pagadoEl ?? '',
      ]);
    }
    out.push(['TOTAL', '', '', filas.reduce((s, x) => s + x.r.pagables, 0), '', '', '', '', '', total, '', '', '']);
    descargarCSV(`pagos-${modo === 'quincena' ? `quincena-${q.desde}` : `emergencia-${dia}`}.csv`, out);
  };

  return (
    <div>
      <Titulo titulo="Pagos" />

      <div className="mb-3">
        <Segmentado<Modo>
          valor={modo}
          onChange={(m) => { setModo(m); setAbierto(null); }}
          opciones={[{ id: 'quincena', label: 'Quincenal' }, { id: 'diario', label: 'Emergencia (diario)' }]}
        />
      </div>

      {/* Período + Más */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => mover(-1)} className="rounded-lg border border-linea bg-superficie p-2 hover:bg-fondo" aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center font-semibold">{modo === 'quincena' ? fmtPeriodo(clave) : fmtDia(dia)}</div>
        <button onClick={() => mover(1)} className="rounded-lg border border-linea bg-superficie p-2 hover:bg-fondo" aria-label="Siguiente">
          <ChevronRight size={18} />
        </button>
        <MenuMas label="" items={[{ label: 'Descargar Excel', icon: <Download size={16} />, onClick: exportar }]} />
      </div>

      {/* 1. Lo que falta pagar */}
      <div data-tour="pagos-resumen" className="mb-4 rounded-xl border border-linea bg-superficie p-4">
        <div className="text-sm text-suave">{modo === 'quincena' ? 'Por pagar esta quincena' : 'Por pagar este día'}</div>
        <div className="text-3xl font-semibold tracking-tight text-primario tabular-nums">{clp(total - pagado)}</div>
        <div className="mt-1 text-sm text-suave">Total {clp(total)} · Pagado {clp(pagado)}</div>
      </div>

      {/* 2. Una fila por persona; el detalle se abre al tocarla */}
      <Card className="!p-0">
        {filas.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-suave">
            {modo === 'quincena' ? 'No hay turnos en esta quincena.' : 'Nadie de emergencia trabajó este día.'}
          </p>
        )}
        <ul className="divide-y divide-linea">
          {filas.map(({ c, r }) => {
            const abierta = abierto === c.id;
            return (
              <li key={c.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setAbierto(abierta ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="hidden sm:block"><Avatar c={c} size={38} /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium"><span className="sm:hidden">{primerNombre(c.nombre)}</span><span className="hidden sm:inline">{c.nombre}</span></span>
                      <span className="flex items-center gap-1 text-sm text-suave">
                        <span className="truncate">{r.pagables} turno{r.pagables === 1 ? '' : 's'}{r.horasExtra ? ` + ${fmtHoras(r.horasExtra)} extra` : ''}</span>
                        {r.sinConfirmar > 0 && !r.pagado && <AlertTriangle size={13} className="shrink-0 text-aviso" />}
                        <ChevronDown size={14} className={cx('shrink-0 transition', abierta && 'rotate-180')} />
                      </span>
                    </span>
                  </button>
                  <span className="shrink-0 text-right font-semibold tabular-nums">{clp(monto(r))}</span>
                  {r.pagado ? (
                    <span className="flex w-20 shrink-0 flex-col items-center rounded-md bg-ok-50 px-1 py-1 text-xs font-medium text-ok">
                      <span className="inline-flex items-center gap-1"><Check size={13} strokeWidth={3} /> Pagado</span>
                      <span className="w-full truncate text-center text-[11px] font-normal">{textoForma(r.pago!)}</span>
                    </span>
                  ) : (
                    <Boton chico className="w-20 shrink-0" onClick={() => setPagando(c.id)}>
                      Pagar
                    </Boton>
                  )}
                </div>

                {abierta && (
                  <div className="anim-entrar space-y-3 bg-fondo px-4 py-3 text-sm">
                    <div className="text-suave">
                      {[nombreSede(db, c.sedeId) ?? 'Todas las sedes', nombreArea(c.area)].join(' · ')}
                      <br />
                      {r.pagables} × {clp(r.valor)}
                      {r.horasExtra > 0 && ` + ${fmtHoras(r.horasExtra)} extra × ${clp(r.valorExtra)}`} = {clp(r.subtotal)}
                      {r.faltas > 0 && <span className="text-alerta"> · {r.faltas} falta{r.faltas > 1 ? 's' : ''}</span>}
                      {r.atrasos > 0 && <span className="text-aviso"> · {r.atrasos} atraso{r.atrasos > 1 ? 's' : ''}</span>}
                    </div>
                    {r.pagado && <div className="font-medium text-ok">Pagado el {fmtDia(r.pago!.pagadoEl!)} · {textoForma(r.pago!)}</div>}
                    {r.porVenir > 0 && !r.pagado && <div className="text-suave">Incluye {r.porVenir} turno{r.porVenir > 1 ? 's' : ''} por venir.</div>}
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
                            href={linkWhatsApp(c.telefono, `Hola ${primerNombre(c.nombre)}, te transferí ${clp(r.pago!.monto)} por ${r.pagables} turno${r.pagables === 1 ? '' : 's'}${r.horasExtra ? ` y ${fmtHoras(r.horasExtra)} extra` : ''} (${fmtPeriodo(clave)}). ¡Gracias por tu trabajo!`)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Boton chico variante="suave">
                              <MessageCircle size={15} /> Avisarle
                            </Boton>
                          </a>
                          <Boton chico variante="fantasma" onClick={() => guardarPago(c.id, { pagadoEl: null, monto: 0, forma: undefined, formaNota: undefined })}>
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

      {fila && (
        <ConfirmarPago
          nombre={fila.c.nombre}
          monto={fila.r.total}
          periodo={modo === 'quincena' ? fmtPeriodo(clave) : fmtDia(dia)}
          inicial={modo === 'diario' ? 'dia' : 'quincena'}
          onClose={() => setPagando(null)}
          onConfirmar={(forma, formaNota) => {
            vibrar(12);
            guardarPago(fila.c.id, { pagadoEl: h, monto: fila.r.total, forma, formaNota: forma === 'otro' ? formaNota.trim() || undefined : undefined });
          }}
        />
      )}
    </div>
  );
}

/** Antes de marcar pagado: cómo se le pagó. Viene marcada la opción normal, así basta un toque más. */
function ConfirmarPago({ nombre, monto, periodo, inicial, onClose, onConfirmar }: {
  nombre: string;
  monto: number;
  periodo: string;
  inicial: FormaPago;
  onClose: () => void;
  onConfirmar: (forma: FormaPago, nota: string) => void;
}) {
  const [forma, setForma] = useState<FormaPago>(inicial);
  const [nota, setNota] = useState('');
  return (
    <Modal titulo={`Pagar a ${primerNombre(nombre)}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{clp(monto)}</div>
          <div className="text-sm text-suave">{periodo}</div>
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">¿Cómo se le pagó?</div>
          <Segmentado<FormaPago> valor={forma} onChange={setForma} opciones={FORMAS_PAGO} />
        </div>
        {forma === 'otro' && (
          <input
            autoFocus
            className={inputCls}
            maxLength={40}
            placeholder="Ej: adelanto, en dos partes"
            aria-label="Detalle del pago"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        )}
        <Boton className="w-full" onClick={() => { onConfirmar(forma, nota); onClose(); }}>
          <Check size={16} /> Marcar pagado
        </Boton>
      </div>
    </Modal>
  );
}
