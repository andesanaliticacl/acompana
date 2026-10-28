import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Movimiento } from '../lib/types';
import { clp, fmtCorto, fmtDia, fmtMes, hoy, iso, lunesDe, parse, sumarDias, uid } from '../lib/fechas';
import { descargarCSV } from '../lib/calculos';
import { Boton, Campo, Card, MenuMas, Modal, Segmentado, Titulo, cx, inputCls } from '../components/ui';

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
  const [verGrafico, setVerGrafico] = useState(false);
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
      <Titulo titulo="Caja" />

      {/* Período + Registrar + Más */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => mover(-1)} className="rounded-lg border border-linea bg-white p-2 hover:bg-fondo" aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 truncate text-center font-semibold">
          {periodo === 'mes' ? fmtMes(desde) : `${fmtCorto(desde)} – ${fmtCorto(hasta)}`}
        </div>
        <button onClick={() => mover(1)} className="rounded-lg border border-linea bg-white p-2 hover:bg-fondo" aria-label="Siguiente">
          <ChevronRight size={18} />
        </button>
        <Boton chico aria-label="Registrar ingreso o gasto" onClick={() => setForm(nuevo('ingreso'))}>
          <Plus size={16} /> <span className="hidden sm:inline">Registrar</span>
        </Boton>
        <MenuMas
          label=""
          items={[
            periodo === 'semana'
              ? { label: 'Ver por mes', icon: <CalendarDays size={16} />, onClick: () => { setPeriodo('mes'); setAncla(h); } }
              : { label: 'Ver por semana', icon: <CalendarDays size={16} />, onClick: () => { setPeriodo('semana'); setAncla(h); } },
            { label: verGrafico ? 'Ocultar gráfico' : 'Ver gráfico semana a semana', icon: <BarChart3 size={16} />, onClick: () => setVerGrafico((x) => !x) },
            { label: 'Descargar Excel', icon: <Download size={16} />, onClick: exportar },
          ]}
        />
      </div>

      {/* 1. Tres cifras */}
      <div data-tour="caja-kpis" className="mb-4 grid grid-cols-3 divide-x divide-linea overflow-hidden rounded-xl border border-linea bg-white">
        <Kpi label="Entró" valor={ingresos} color="text-ok" />
        <Kpi label="Salió" valor={pagosCuid + otrosGastos} color="text-tinta" />
        <Kpi label="Te queda" valor={saldo} color={saldo >= 0 ? 'text-primario' : 'text-alerta'} />
      </div>

      {/* 2. Gráfico (solo si se pide) */}
      {verGrafico && (
        <Card className="mb-4">
          <h2 className="mb-3 text-sm font-semibold">{periodo === 'mes' ? 'Semanas del mes' : 'Últimas 6 semanas'}</h2>
          <div className="space-y-3">
            {porSemana.map((s) => (
              <div key={s.l}>
                <div className="mb-1 flex justify-between text-xs text-suave">
                  <span>{fmtCorto(s.l)} – {fmtCorto(sumarDias(s.l, 6))}</span>
                  <span className={cx('font-medium', s.ing - s.gas >= 0 ? 'text-ok' : 'text-alerta')}>{clp(s.ing - s.gas)}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 rounded-full bg-ok/80" style={{ width: `${(s.ing / maxSem) * 100}%`, minWidth: s.ing ? 6 : 0 }} />
                  <div className="h-2.5 rounded-full bg-alerta-200" style={{ width: `${(s.gas / maxSem) * 100}%`, minWidth: s.gas ? 6 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-suave">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ok/80" /> Entró</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-alerta-200" /> Salió</span>
          </div>
        </Card>
      )}

      {/* 3. Movimientos */}
      <Card className="!p-0">
        {lineas.length === 0 && <p className="px-4 py-8 text-center text-sm text-suave">No hay movimientos en este período.</p>}
        <ul className="divide-y divide-linea">
          {lineas.map((l) => (
            <li key={l.id}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-fondo" disabled={!l.mov} onClick={() => l.mov && setForm(l.mov)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.tipo === 'ingreso' && l.mov?.cliente ? l.mov.cliente : l.concepto}</span>
                  <span className="block truncate text-xs text-suave">{fmtDia(l.fecha)}{l.tipo === 'ingreso' && l.mov?.cliente ? ` · ${l.concepto}` : l.detalle ? ` · ${l.detalle}` : ''}</span>
                </span>
                <span className={cx('shrink-0 font-semibold tabular-nums', l.tipo === 'ingreso' ? 'text-ok' : 'text-tinta')}>
                  {l.tipo === 'ingreso' ? '+' : '−'}{clp(l.monto)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

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

function Kpi({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="px-2 py-3 text-center sm:p-4">
      <div className="text-xs text-suave">{label}</div>
      <div className={cx('mt-0.5 text-[15px] font-semibold tabular-nums sm:text-xl', color)}>{clp(valor)}</div>
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
