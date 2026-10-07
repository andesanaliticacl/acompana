import { useState } from 'react';
import { Building2, Check, Phone, Plus, Search, UserPlus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Cliente } from '../lib/types';
import { clp, edad, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { requeridasCliente } from '../lib/calculos';
import { PALETA } from '../lib/colores';
import { Boton, Campo, Card, Contador, Modal, Titulo, TurnoIcono, cx, inputCls, primerNombre } from '../components/ui';

/** Clientes = adultos mayores atendidos, ordenados por piso. */
export function Clientes() {
  const { db, upsert } = useStore();
  const [q, setQ] = useState('');
  const [editar, setEditar] = useState<Cliente | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);
  const h = hoy();
  const lunes = lunesDe(h);
  const domingo = sumarDias(lunes, 6);

  const lista = db.clientes
    .filter((k) => verInactivos || k.activo)
    .filter((k) => (k.nombre + ' ' + k.contacto + ' ' + k.cuidados).toLowerCase().includes(q.toLowerCase()));
  const grupos = [...db.pisos, { id: '', nombre: 'Sin piso' }]
    .map((p) => ({ p, cs: lista.filter((k) => (k.pisoId ?? '') === p.id).sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
    .filter((g) => g.cs.length);
  const inactivos = db.clientes.filter((k) => !k.activo).length;
  const totalSemanal = db.clientes.filter((k) => k.activo).reduce((s, k) => s + k.cobroSemanal, 0);

  // ¿Ya pagó esta semana? (ingreso registrado en Caja a su nombre)
  const pagoSemana = (k: Cliente) =>
    db.movimientos.find((m) => m.tipo === 'ingreso' && m.cliente === k.nombre && m.fecha >= lunes && m.fecha <= domingo);

  const registrarPago = (k: Cliente) => {
    if (!confirm(`¿Registrar el pago de ${clp(k.cobroSemanal)} de ${k.nombre} en Caja?`)) return;
    upsert('movimientos', { id: uid(), fecha: h, tipo: 'ingreso', concepto: 'Servicio de cuidado semanal', cliente: k.nombre, monto: k.cobroSemanal, medio: 'transferencia' });
  };

  const nuevo = (): Cliente => ({
    id: uid(), nombre: '', pisoId: db.pisos[0]?.id, contacto: '', telefono: '+56 9 ', cuidados: '',
    requeridas: Object.fromEntries(db.turnos.map((t) => [t.id, 1])), cobroSemanal: 0, activo: true,
  });

  return (
    <div>
      <Titulo titulo="Clientes" sub={`${db.clientes.filter((k) => k.activo).length} clientes · ${clp(totalSemanal)} por semana`}>
        <Boton onClick={() => setEditar(nuevo())}>
          <UserPlus size={18} /> Nuevo cliente
        </Boton>
      </Titulo>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
          <input className={cx(inputCls, 'pl-10')} placeholder="Buscar por nombre, familiar o cuidado" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {inactivos > 0 && (
          <label className="flex items-center gap-2 text-sm text-suave">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos ({inactivos})
          </label>
        )}
      </div>

      <div className="space-y-6">
        {grupos.map(({ p, cs }) => (
          <section key={p.id || 'sin'}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-suave uppercase">
              <Building2 size={15} /> {p.nombre} <span className="font-normal normal-case">· {cs.length} cliente{cs.length === 1 ? '' : 's'}</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cs.map((k) => {
                const hoyLaCuidan = db.asignaciones.filter((a) => a.fecha === h && a.clienteId === k.id && a.estado !== 'falto');
                const pago = pagoSemana(k);
                return (
                  <Card key={k.id} onClick={() => setEditar(k)} className={cx('flex flex-col', !k.activo && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{k.nombre}</h3>
                        <p className="text-sm text-suave">
                          {k.fechaNacimiento ? `${edad(k.fechaNacimiento)} años · ` : ''}{k.contacto || 'Sin contacto'}
                        </p>
                      </div>
                      {k.telefono.replace(/\D/g, '').length > 6 && (
                        <a href={`tel:${k.telefono.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} className="rounded-lg border border-linea p-2 text-suave hover:bg-fondo" aria-label="Llamar al familiar">
                          <Phone size={15} />
                        </a>
                      )}
                    </div>
                    {k.cuidados && <p className="mt-2 line-clamp-2 text-sm">{k.cuidados}</p>}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {db.turnos.map((t) => {
                        const n = requeridasCliente(k, t.id);
                        return (
                          <span key={t.id} className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', !n && 'opacity-50')} style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}>
                            <TurnoIcono icono={t.icono} size={12} /> {t.nombre}: {n ? `${n} cuidadora${n > 1 ? 's' : ''}` : 'no'}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-3 border-t border-linea pt-3 text-sm">
                      <span className="text-suave">Hoy: </span>
                      {hoyLaCuidan.length ? (
                        hoyLaCuidan.map((a) => {
                          const c = db.cuidadoras.find((x) => x.id === a.cuidadoraId);
                          const t = db.turnos.find((x) => x.id === a.turnoId);
                          return c && t ? `${primerNombre(c.nombre)} (${t.nombre.toLowerCase()})` : null;
                        }).filter(Boolean).join(', ')
                      ) : (
                        <span className="text-alerta">sin cuidadora asignada</span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <span className="text-sm"><b className="tabular-nums">{clp(k.cobroSemanal)}</b> <span className="text-suave">/ semana</span></span>
                      {pago ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-ok-50 px-2 py-1 text-xs font-medium text-ok">
                          <Check size={13} strokeWidth={3} /> Pagó esta semana
                        </span>
                      ) : (
                        <Boton chico variante="suave" onClick={(e) => { e.stopPropagation(); registrarPago(k); }} disabled={!k.cobroSemanal}>
                          <Plus size={14} /> Registrar pago
                        </Boton>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
        {grupos.length === 0 && <p className="text-suave">No hay clientes que coincidan.</p>}
      </div>

      {editar && <FormCliente inicial={editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

function FormCliente({ inicial, onClose }: { inicial: Cliente; onClose: () => void }) {
  const { db, upsert } = useStore();
  const [f, setF] = useState<Cliente>(inicial);
  const set = (p: Partial<Cliente>) => setF((x) => ({ ...x, ...p }));
  const existe = db.clientes.some((k) => k.id === f.id);

  return (
    <Modal titulo={existe ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Campo label="Nombre del cliente">
            <input className={inputCls} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej: Inés Larraín" autoFocus />
          </Campo>
          <Campo label="Piso">
            <select className={inputCls} value={f.pisoId ?? ''} onChange={(e) => set({ pisoId: e.target.value || undefined })}>
              {db.pisos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              <option value="">Sin piso</option>
            </select>
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Fecha de nacimiento" ayuda={f.fechaNacimiento ? `${edad(f.fechaNacimiento)} años` : undefined}>
            <input type="date" className={inputCls} value={f.fechaNacimiento ?? ''} onChange={(e) => set({ fechaNacimiento: e.target.value || undefined })} />
          </Campo>
          <Campo label="Familiar responsable">
            <input className={inputCls} value={f.contacto} onChange={(e) => set({ contacto: e.target.value })} placeholder="Ej: Carolina (hija)" />
          </Campo>
          <Campo label="Teléfono familiar">
            <input className={inputCls} value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} inputMode="tel" />
          </Campo>
        </div>
        <Campo label="Cuidados especiales">
          <textarea className={cx(inputCls, 'min-h-20')} value={f.cuidados} onChange={(e) => set({ cuidados: e.target.value })} placeholder="Diagnóstico, movilidad, dieta, horarios de medicamentos…" />
        </Campo>
        <div className="flex flex-wrap items-end gap-4">
          {db.turnos.map((t) => (
            <Campo key={t.id} label={`Cuidadoras turno ${t.nombre.toLowerCase()}`}>
              <Contador valor={f.requeridas[t.id] ?? 0} min={0} onChange={(v) => set({ requeridas: { ...f.requeridas, [t.id]: v } })} />
            </Campo>
          ))}
          <Campo label="Cobro semanal (CLP)">
            <input type="number" min={0} step={10000} className={cx(inputCls, '!w-44')} value={f.cobroSemanal || ''} onChange={(e) => set({ cobroSemanal: Number(e.target.value) })} />
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4" checked={f.activo} onChange={(e) => set({ activo: e.target.checked })} /> Cliente activo
        </label>
        <div className="border-t border-linea pt-4">
          <Boton
            className="w-full"
            disabled={!f.nombre.trim()}
            onClick={() => {
              upsert('clientes', { ...f, nombre: f.nombre.trim() });
              onClose();
            }}
          >
            Guardar
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
