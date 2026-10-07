import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Download, HeartHandshake, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Movimiento } from '../lib/types';
import { clp, fmtCorto, fmtDia, fmtMes, hoy, iso, lunesDe, parse, sumarDias, uid } from '../lib/fechas';
import { descargarCSV } from '../lib/calculos';
import { Boton, Campo, Card, Modal, Segmentado, Titulo, cx, inputCls } from '../components/ui';

interface Linea {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  detalle?: string;
  monto: number;
  auto?: boolean; // viene de un pago a cuidadora
  mov?: Movimiento;
}

const inicioMes = (s: string) => s.slice(0, 8) + '01';
const moverMes = (s: string, n: number) => {
  const d = parse(s);
  return iso(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

export function Caja() {
  const { db, upsert, remove } = useStore();
  const h = hoy();
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  const [ancla, setAncla] = useState(h);
  const [form, setForm] = useState<Movimiento | null>(null);
  const desde = periodo === 'semana' ? lunesDe(ancla) : inicioMes(ancla);
  const hasta = periodo === 'semana' ? sumarDias(desde, 6) : sumarDias(moverMes(desde, 1), -1);
  const enMes = (f: string) => f >= desde && f <= hasta;
  const mover = (n: number) => setAncla(periodo === 'semana' ? sumarDias(desde, 7 * n) : moverMes(desde, n));

  const lineas: Linea[] = [
    ...db.movimientos.filter((m) => enMes(m.fecha)).map((m) => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, concepto: m.concepto, detalle: [m.cliente, m.medio === 'efectivo' ? 'Efectivo' : 'Transferencia'].filter(Boolean).join(' · '), monto: m.monto, mov: m,
    })),
    ...db.pagos.filter((p) => p.pagadoEl && enMes(p.pagadoEl)).map((p) => ({
      id: p.id, fecha: p.pagadoEl!, tipo: 'gasto' as const, concepto: `Pago a ${db.cuidadoras.find((c) => c.id === p.cuidadoraId)?.nombre ?? 'cuidadora'}`,
      detalle: `Semana del ${fmtCorto(p.semana)}`, monto: p.monto, auto: true,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.tipo.localeCompare(b.tipo));

  const ingresos = lineas.filter((l) => l.tipo === 'ingreso').reduce((s, l) => s + l.monto, 0);
  const pagosCuid = lineas.filter((l) => l.auto).reduce((s, l) => s + l.monto, 0);
  const otrosGastos = lineas.filter((l) => l.tipo === 'gasto' && !l.auto).reduce((s, l) => s + l.monto, 0);
  const saldo = ingresos - pagosCuid - otrosGastos;

  // Barras: semanas del mes, o las últimas 6 semanas en vista semanal
  const semanas: string[] = [];
  if (periodo === 'mes') for (let l = lunesDe(desde); l <= hasta; l = sumarDias(l, 7)) semanas.push(l);
  else for (let i = 5; i >= 0; i--) semanas.push(sumarDias(desde, -7 * i));
  const porSemana = semanas.map((l) => {
    const fin = sumarDias(l, 6);
    const enRango = (f: string) => f >= l && f <= fin;
    const ing = db.movimientos.filter((m) => m.tipo === 'ingreso' && enRango(m.fecha)).reduce((s, m) => s + m.monto, 0);
    const gas =
      db.movimientos.filter((m) => m.tipo === 'gasto' && enRango(m.fecha)).reduce((s, m) => s + m.monto, 0) +
      db.pagos.filter((p) => p.pagadoEl && enRango(p.pagadoEl)).reduce((s, p) => s + p.monto, 0);
    return { l, ing, gas };
  });
  const maxSem = Math.max(1, ...porSemana.flatMap((s) => [s.ing, s.gas]));

  const clientes = [...new Set([...db.clientes.map((k) => k.nombre), ...db.movimientos.map((m) => m.cliente)].filter(Boolean))] as string[];
  const nuevo = (tipo: Movimiento['tipo']): Movimiento => ({ id: uid(), fecha: h, tipo, concepto: tipo === 'ingreso' ? 'Cuidado semanal' : '', monto: 0, cliente: '', medio: 'transferencia' });

  const exportar = () => {
    const out: (string | number)[][] = [['Fecha', 'Tipo', 'Concepto', 'Detalle', 'Monto']];
    for (const l of [...lineas].reverse()) out.push([l.fecha, l.tipo, l.concepto, l.detalle ?? '', l.tipo === 'gasto' ? -l.monto : l.monto]);
    out.push(['', '', '', 'SALDO', saldo]);
    descargarCSV(`caja-${desde}-al-${hasta}.csv`, out);
  };

  return (
    <div>
      <Titulo titulo="Caja" sub="Lo que entra y lo que sale, sin cuaderno">
        <Boton variante="fantasma" chico onClick={exportar}>
          <Download size={16} /> Excel
        </Boton>
        <Boton chico className="!bg-ok" onClick={() => setForm(nuevo('ingreso'))}>
          <ArrowDownCircle size={16} /> Ingreso
        </Boton>
        <Boton chico variante="suave" onClick={() => setForm(nuevo('gasto'))}>
          <ArrowUpCircle size={16} /> Gasto
        </Boton>
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmentado
          valor={periodo}
          onChange={(p) => { setPeriodo(p); setAncla(h); }}
          opciones={[{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]}
        />
        <div className="flex min-w-64 flex-1 items-center gap-2">
          <button onClick={() => mover(-1)} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Anterior">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center text-lg font-semibold">
            {periodo === 'mes' ? fmtMes(desde) : `${fmtCorto(desde)} — ${fmtCorto(hasta)}`}
          </div>
          <button onClick={() => mover(1)} className="rounded-lg border border-linea bg-white p-2 shadow-sm hover:bg-fondo" aria-label="Siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ingresos" valor={ingresos} clase="bg-ok-50 text-ok" />
        <Kpi label="Pagos a cuidadoras" valor={pagosCuid} clase="bg-info-50 text-info" />
        <Kpi label="Otros gastos" valor={otrosGastos} clase="bg-aviso-50 text-aviso" />
        <Kpi label="Te queda" valor={saldo} clase={cx(' border-2', saldo >= 0 ? 'border-ok-50 bg-white' : 'border-primario-200 bg-primario-50 text-primario')} grande />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Movimientos</h2>
          {lineas.length === 0 && <p className="text-suave">No hay movimientos en este período.</p>}
          <ul className="divide-y divide-linea">
            {lineas.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className={cx('grid size-9 shrink-0 place-items-center rounded-full', l.tipo === 'ingreso' ? 'bg-ok-50 text-ok' : l.auto ? 'bg-info-50 text-info' : 'bg-aviso-50 text-aviso')}>
                  {l.tipo === 'ingreso' ? <ArrowDownCircle size={18} /> : l.auto ? <HeartHandshake size={18} /> : <ArrowUpCircle size={18} />}
                </div>
                <button className="min-w-0 flex-1 text-left" disabled={!l.mov} onClick={() => l.mov && setForm(l.mov)}>
                  <div className="truncate font-semibold">{l.concepto}</div>
                  <div className="truncate text-xs text-suave">{fmtDia(l.fecha)}{l.detalle ? ` · ${l.detalle}` : ''}</div>
                </button>
                <div className={cx(' text-lg font-semibold whitespace-nowrap', l.tipo === 'ingreso' ? 'text-ok' : 'text-tinta')}>
                  {l.tipo === 'ingreso' ? '+' : '−'}{clp(l.monto)}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">{periodo === 'mes' ? 'Semanas del mes' : 'Últimas 6 semanas'}</h2>
          <div className="space-y-4">
            {porSemana.map((s) => (
              <div key={s.l}>
                <div className="mb-1 flex justify-between text-xs font-semibold text-suave">
                  <span>{fmtCorto(s.l)} – {fmtCorto(sumarDias(s.l, 6))}</span>
                  <span className={s.ing - s.gas >= 0 ? 'text-ok' : 'text-primario'}>{clp(s.ing - s.gas)}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-3 rounded-full bg-ok/80" style={{ width: `${(s.ing / maxSem) * 100}%`, minWidth: s.ing ? 6 : 0 }} />
                  <div className="h-3 rounded-full bg-alerta-200" style={{ width: `${(s.gas / maxSem) * 100}%`, minWidth: s.gas ? 6 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs font-semibold text-suave">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ok/80" /> Entró</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-alerta-200" /> Salió</span>
          </div>
        </Card>
      </div>

      {form && (
        <FormMovimiento
          inicial={form}
          clientes={clientes}
          esNuevo={!db.movimientos.some((m) => m.id === form.id)}
          onClose={() => setForm(null)}
          onGuardar={(m) => { upsert('movimientos', m); setForm(null); }}
          onBorrar={(id) => { remove('movimientos', id); setForm(null); }}
        />
      )}
    </div>
  );
}

function Kpi({ label, valor, clase, grande }: { label: string; valor: number; clase: string; grande?: boolean }) {
  return (
    <div className={cx('rounded-xl p-4', clase)}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className={cx(' font-semibold', grande ? 'text-2xl' : 'text-2xl')}>{clp(valor)}</div>
    </div>
  );
}

function FormMovimiento({ inicial, clientes, esNuevo, onClose, onGuardar, onBorrar }: { inicial: Movimiento; clientes: string[]; esNuevo: boolean; onClose: () => void; onGuardar: (m: Movimiento) => void; onBorrar: (id: string) => void }) {
  const [f, setF] = useState<Movimiento>(inicial);
  const set = (p: Partial<Movimiento>) => setF((x) => ({ ...x, ...p }));
  return (
    <Modal titulo={f.tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'} onClose={onClose}>
      <div className="space-y-4">
        <Segmentado
          valor={f.tipo}
          onChange={(tipo) => set({ tipo })}
          opciones={[
            { id: 'ingreso', label: 'Entró plata', bg: '#dcf3e9', fg: '#22724f' },
            { id: 'gasto', label: 'Salió plata', bg: '#ffe7d6', fg: '#a8501a' },
          ]}
        />
        <Campo label="Monto">
          <input type="number" min={0} step={1000} inputMode="numeric" className={cx(inputCls, ' text-2xl')} value={f.monto || ''} placeholder="$0" onChange={(e) => set({ monto: Number(e.target.value) })} autoFocus />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha">
            <input type="date" className={inputCls} value={f.fecha} onChange={(e) => e.target.value && set({ fecha: e.target.value })} />
          </Campo>
          <Campo label="Cómo">
            <select className={inputCls} value={f.medio} onChange={(e) => set({ medio: e.target.value as Movimiento['medio'] })}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </Campo>
        </div>
        <Campo label="Concepto">
          <input className={inputCls} value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} placeholder={f.tipo === 'ingreso' ? 'Cuidado semanal' : 'Ej: insumos, movilización'} />
        </Campo>
        {f.tipo === 'ingreso' && (
          <Campo label="Familia / cliente">
            <input className={inputCls} list="clientes" value={f.cliente ?? ''} onChange={(e) => set({ cliente: e.target.value })} placeholder="Ej: Familia Larraín" />
            <datalist id="clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
          </Campo>
        )}
        <div className="flex gap-2">
          <Boton className="flex-1" disabled={!f.monto || !f.concepto.trim()} onClick={() => onGuardar(f)}>
            Guardar
          </Boton>
          {!esNuevo && (
            <Boton variante="peligro" onClick={() => confirm('¿Borrar este movimiento?') && onBorrar(f.id)}>
              <Trash2 size={18} />
            </Boton>
          )}
        </div>
      </div>
    </Modal>
  );
}
