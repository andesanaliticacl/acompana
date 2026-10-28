import { useState } from 'react';
import { Check, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Cliente, Persona } from '../lib/types';
import { clp, hoy, lunesDe, sumarDias, uid } from '../lib/fechas';
import { Boton, Campo, Card, Contador, MenuMas, Modal, Titulo, cx, inputCls } from '../components/ui';

/** Clientes = apoderados. Cada uno tiene a cargo una o más personas cuidadas. */
export function Clientes({ param }: { param?: string }) {
  const { db, upsert } = useStore();
  const [q, setQ] = useState(param ?? '');
  const [editar, setEditar] = useState<Cliente | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);
  const h = hoy();
  const lunes = lunesDe(h);
  const domingo = sumarDias(lunes, 6);

  const personasDe = (c: Cliente) => db.personas.filter((p) => p.clienteId === c.id);
  const lista = db.clientes
    .filter((c) => verInactivos || c.activo)
    .filter((c) => [c.nombre, ...personasDe(c).map((p) => p.nombre)].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const inactivos = db.clientes.filter((c) => !c.activo).length;
  const totalSemanal = db.clientes.filter((c) => c.activo).reduce((s, c) => s + c.cobroSemanal, 0);

  // ¿Ya pagó esta semana? (ingreso registrado en Caja a su nombre)
  const pagoSemana = (c: Cliente) =>
    db.movimientos.find((m) => m.tipo === 'ingreso' && m.cliente === c.nombre && m.fecha >= lunes && m.fecha <= domingo);

  const registrarPago = (c: Cliente) => {
    if (!confirm(`¿Registrar el pago de ${clp(c.cobroSemanal)} de ${c.nombre} en Caja?`)) return;
    upsert('movimientos', { id: uid(), fecha: h, tipo: 'ingreso', concepto: 'Servicio de cuidado semanal', cliente: c.nombre, monto: c.cobroSemanal, medio: 'transferencia' });
  };

  return (
    <div>
      <Titulo titulo="Clientes" />

      {/* Buscar + Nuevo (+ Más si hay inactivos) */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
          <input className={cx(inputCls, '!py-2 pl-10')} placeholder="Buscar cliente o residente" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Boton chico onClick={() => setEditar({ id: uid(), nombre: '', telefono: '+56 9 ', cobroSemanal: 0, activo: true })}>
          <UserPlus size={16} /> Nuevo
        </Boton>
        {inactivos > 0 && (
          <MenuMas label="" items={[{ label: verInactivos ? 'Ocultar inactivos' : `Ver inactivos (${inactivos})`, onClick: () => setVerInactivos((x) => !x) }]} />
        )}
      </div>

      {/* Lista simple: cliente, su residente y si pagó la semana */}
      <Card tour="cli-lista" className="!p-0">
        <ul className="divide-y divide-linea">
          {lista.map((c) => {
            const pago = pagoSemana(c);
            const rs = personasDe(c);
            const piso = (id?: string) => db.pisos.find((p) => p.id === id)?.nombre;
            return (
              <li key={c.id} className={cx('flex items-center gap-3 px-4 py-3', !c.activo && 'opacity-60')}>
                <button onClick={() => setEditar(c)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium">{c.nombre}</span>
                  <span className="block truncate text-sm text-suave">
                    {rs.length ? rs.map((p) => [p.nombre, piso(p.pisoId)].filter(Boolean).join(' · ')).join(' / ') : 'Sin residente'}
                  </span>
                </button>
                {pago ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ok-50 px-2 py-1 text-xs font-medium text-ok">
                    <Check size={13} strokeWidth={3} /> Pagó
                  </span>
                ) : (
                  <Boton chico variante="suave" className="shrink-0" onClick={() => registrarPago(c)} disabled={!c.cobroSemanal}>
                    Cobrar
                  </Boton>
                )}
              </li>
            );
          })}
        </ul>
        {lista.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-suave">
            {db.clientes.length ? 'No hay clientes que coincidan.' : 'Aún no hay clientes. Toca "Nuevo" para agregar el primero con su residente.'}
          </p>
        )}
      </Card>
      <p className="mt-2 px-1 text-xs text-suave">Total por semana: {clp(totalSemanal)} · Toca un cliente para ver o editar su ficha.</p>

      {editar && <FormCliente inicial={editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

function FormCliente({ inicial, onClose }: { inicial: Cliente; onClose: () => void }) {
  const { db, upsert, upsertMuchos, remove } = useStore();
  const [f, setF] = useState<Cliente>(inicial);
  const originales = db.personas.filter((p) => p.clienteId === inicial.id);
  const [personas, setPersonas] = useState<Persona[]>(originales);
  const existe = db.clientes.some((c) => c.id === f.id);
  const set = (p: Partial<Cliente>) => setF((x) => ({ ...x, ...p }));
  const setPersona = (id: string, p: Partial<Persona>) => setPersonas((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const agregar = () =>
    setPersonas((xs) => [
      ...xs,
      { id: uid(), clienteId: f.id, nombre: '', pisoId: db.pisos[0]?.id, cuidados: '', requeridas: Object.fromEntries(db.turnos.map((t) => [t.id, 1])), activa: true },
    ]);

  const guardar = () => {
    upsert('clientes', { ...f, nombre: f.nombre.trim() });
    const validas = personas.filter((p) => p.nombre.trim()).map((p) => ({ ...p, nombre: p.nombre.trim(), activa: p.activa && f.activo }));
    upsertMuchos('personas', validas);
    for (const o of originales) if (!validas.some((p) => p.id === o.id)) remove('personas', o.id);
    onClose();
  };

  return (
    <Modal titulo={existe ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose} ancho="max-w-2xl">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Cliente (apoderado)">
            <input className={inputCls} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej: Carolina Larraín" autoFocus />
          </Campo>
          <Campo label="Teléfono">
            <input className={inputCls} value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} inputMode="tel" />
          </Campo>
          <Campo label="Cobro semanal (CLP)">
            <input type="number" min={0} step={10000} className={inputCls} value={f.cobroSemanal || ''} onChange={(e) => set({ cobroSemanal: Number(e.target.value) })} />
          </Campo>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Residentes a su cargo</span>
            <Boton chico variante="suave" onClick={agregar}>
              <Plus size={14} /> Agregar residente
            </Boton>
          </div>
          <div className="space-y-3">
            {personas.map((p) => (
              <div key={p.id} className="space-y-3 rounded-lg border border-linea bg-fondo p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px_auto]">
                  <Campo label="Nombre">
                    <input className={inputCls} value={p.nombre} onChange={(e) => setPersona(p.id, { nombre: e.target.value })} placeholder="Ej: Inés Larraín" />
                  </Campo>
                  <Campo label="Piso">
                    <select className={inputCls} value={p.pisoId ?? ''} onChange={(e) => setPersona(p.id, { pisoId: e.target.value || undefined })}>
                      {db.pisos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                      <option value="">Sin piso</option>
                    </select>
                  </Campo>
                  <Campo label="Nacimiento">
                    <input type="date" className={inputCls} value={p.fechaNacimiento ?? ''} onChange={(e) => setPersona(p.id, { fechaNacimiento: e.target.value || undefined })} />
                  </Campo>
                  <button
                    onClick={() => setPersonas((xs) => xs.filter((x) => x.id !== p.id))}
                    className="mt-6 self-start rounded-lg p-2.5 text-alerta hover:bg-alerta-50"
                    aria-label="Quitar residente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <Campo label="Cuidados especiales (opcional)">
                  <input className={inputCls} value={p.cuidados} onChange={(e) => setPersona(p.id, { cuidados: e.target.value })} placeholder="Ej: diabético, insulina 8:00 y 20:00" />
                </Campo>
                <div className="flex flex-wrap gap-4">
                  {db.turnos.map((t) => (
                    <Campo key={t.id} label={`Cuidadoras turno ${t.nombre.toLowerCase()}`}>
                      <Contador valor={p.requeridas[t.id] ?? 0} min={0} onChange={(v) => setPersona(p.id, { requeridas: { ...p.requeridas, [t.id]: v } })} />
                    </Campo>
                  ))}
                </div>
              </div>
            ))}
            {personas.length === 0 && <p className="text-sm text-suave">Agrega al residente que se va a cuidar.</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4" checked={f.activo} onChange={(e) => set({ activo: e.target.checked })} /> Cliente activo
        </label>
        <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-linea bg-white px-5 py-3">
          <Boton className="w-full" disabled={!f.nombre.trim()} onClick={guardar}>
            Guardar
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
