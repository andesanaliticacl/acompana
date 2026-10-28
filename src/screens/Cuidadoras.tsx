import { useState, type ReactNode } from 'react';
import { ChevronRight, MessageCircle, Pencil, Phone, Search, UserPlus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Cuidadora } from '../lib/types';
import { ESTADOS, RASGOS } from '../lib/types';
import { clp, edad, fmtDia, fmtHora, fmtHoras } from '../lib/fechas';
import { estadisticas, linkWhatsApp, personaDe } from '../lib/calculos';
import { COLORES, PALETA } from '../lib/colores';
import { uid } from '../lib/fechas';
import { Avatar, Boton, Campo, Card, Estrellas, MenuMas, Modal, Rasgo, Titulo, TurnoIcono, cx, inputCls, primerNombre } from '../components/ui';

export function Cuidadoras({ param }: { param?: string }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [verId, setVerId] = useState<string | null>(param ?? null);
  const [editar, setEditar] = useState<Cuidadora | null>(null);
  const [verInactivas, setVerInactivas] = useState(false);

  const lista = db.cuidadoras
    .filter((c) => (verInactivas ? true : c.activa))
    .filter((c) => (c.nombre + ' ' + c.rasgos.join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.valoracion - a.valoracion || a.nombre.localeCompare(b.nombre));
  const inactivas = db.cuidadoras.filter((c) => !c.activa).length;
  const vista = db.cuidadoras.find((c) => c.id === verId);

  return (
    <div>
      <Titulo titulo="Cuidadoras" />

      {/* Buscar + Nueva (+ Más si hay inactivas) */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
          <input className={cx(inputCls, '!py-2 pl-10')} placeholder="Buscar cuidadora" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Boton chico onClick={() => setEditar(nueva())}>
          <UserPlus size={16} /> Nueva
        </Boton>
        {inactivas > 0 && (
          <MenuMas label="" items={[{ label: verInactivas ? 'Ocultar inactivas' : `Ver inactivas (${inactivas})`, onClick: () => setVerInactivas((x) => !x) }]} />
        )}
      </div>

      {/* Lista simple: foto, nombre, estrellas y una línea */}
      <Card tour="cuid-lista" className="!p-0">
        <ul className="divide-y divide-linea">
          {lista.map((c) => {
            const s = estadisticas(db, c.id);
            return (
              <li key={c.id}>
                <button onClick={() => setVerId(c.id)} className={cx('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fondo', !c.activa && 'opacity-60')}>
                  <Avatar c={c} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.nombre}</span>
                      <Estrellas valor={c.valoracion} size={13} />
                    </span>
                    <span className="block truncate text-sm text-suave">
                      {c.experiencia} años exp.{s.puntualidad !== null ? ` · ${pct(s.puntualidad)} puntual` : ""}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-suave" />
                </button>
              </li>
            );
          })}
        </ul>
        {lista.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-suave">
            {db.cuidadoras.length ? 'No hay cuidadoras que coincidan.' : 'Aún no hay cuidadoras. Toca "Nueva" para agregar la primera.'}
          </p>
        )}
      </Card>


      {vista && <Perfil c={vista} onClose={() => setVerId(null)} onEditar={() => { setEditar(vista); setVerId(null); }} />}
      {editar && <FormCuidadora inicial={editar} onClose={() => setEditar(null)} onGuardada={(id) => { setEditar(null); setVerId(id); }} />}
    </div>
  );
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-linea bg-fondo px-1 py-2">
      <div className="text-base font-semibold">{valor}</div>
      <div className="text-[11px] text-suave">{label}</div>
    </div>
  );
}

const nueva = (): Cuidadora => ({
  id: uid(), nombre: '', fechaNacimiento: '1985-01-01', experiencia: 1, telefono: '+56 9 ', descripcion: '', rasgos: [],
  valoracion: 3, tarifaHora: 4000, color: COLORES[Math.floor(Math.random() * COLORES.length)], activa: true, notas: '',
});

function Perfil({ c, onClose, onEditar }: { c: Cuidadora; onClose: () => void; onEditar: () => void }) {
  const { db } = useStore();
  const s = estadisticas(db, c.id);
  const [mas, setMas] = useState(false);
  const turno = (id: string) => db.turnos.find((t) => t.id === id);
  const fila = (a: (typeof s.proximos)[number], derecha: ReactNode) => (
    <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        {turno(a.turnoId) && <TurnoIcono icono={turno(a.turnoId)!.icono} size={14} className="shrink-0 text-suave" />}
        <span className="font-medium">{fmtDia(a.fecha)}</span>
        {personaDe(db, a) && <span className="truncate text-suave">· {personaDe(db, a)!.nombre}</span>}
      </span>
      {derecha}
    </li>
  );

  return (
    <Modal titulo={c.nombre} onClose={onClose}>
      {/* 1. Quién es */}
      <div className="flex items-center gap-4">
        <Avatar c={c} size={60} />
        <div className="min-w-0">
          <p className="text-sm text-suave">{edad(c.fechaNacimiento)} años · {c.experiencia} años de experiencia</p>
          <Estrellas valor={c.valoracion} size={16} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {c.rasgos.map((r) => <Rasgo key={r} nombre={r} />)}
          </div>
        </div>
      </div>

      {/* 2. Cómo trabaja */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Asistencia" valor={pct(s.asistencia)} />
        <Mini label="Puntualidad" valor={pct(s.puntualidad)} />
        <Mini label="Valor hora" valor={clp(c.tarifaHora)} />
      </div>

      {/* 3. Próximos turnos */}
      <h3 className="mt-5 mb-1 text-sm font-semibold">Próximos turnos</h3>
      {s.proximos.length === 0 ? (
        <p className="text-sm text-suave">Sin turnos asignados.</p>
      ) : (
        <ul className="divide-y divide-linea">{s.proximos.slice(0, 3).map((a) => fila(a, <span className="shrink-0 text-suave">{fmtHora(a.inicio)}–{fmtHora(a.fin)} h</span>))}</ul>
      )}

      {/* Lo demás, solo si se pide */}
      <button onClick={() => setMas((x) => !x)} className="mt-3 flex items-center gap-1 text-sm font-medium text-primario">
        {mas ? 'Ver menos' : 'Ver más detalles'} <ChevronRight size={15} className={cx('transition', mas && 'rotate-90')} />
      </button>
      {mas && (
        <div className="mt-3 space-y-4 border-t border-linea pt-4">
          {c.descripcion && <p className="text-sm leading-relaxed">{c.descripcion}</p>}
          {c.notas && (
            <div className="rounded-lg bg-aviso-50 p-3 text-sm text-aviso">
              <b>Tus notas privadas:</b> {c.notas}
            </div>
          )}
          <p className="text-sm text-suave">
            Últimas 4 semanas: {fmtHoras(s.horas4)} · Total pagado {clp(s.pagado)} · {s.asistio} a la hora, {s.atraso} con atraso, {s.falto} faltas.
          </p>
          <div>
            <h3 className="mb-1 text-sm font-semibold">Últimos turnos</h3>
            <ul className="divide-y divide-linea">
              {s.ultimos.map((a) =>
                fila(a, (
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: ESTADOS[a.estado].bg, color: ESTADOS[a.estado].fg }}>
                    {ESTADOS[a.estado].label}
                  </span>
                )),
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="sticky bottom-0 -mx-5 -mb-6 mt-5 flex gap-2 border-t border-linea bg-white px-5 py-3">
        <a href={linkWhatsApp(c.telefono, `Hola ${primerNombre(c.nombre)}`)} target="_blank" rel="noreferrer" className="flex-1">
          <Boton variante="suave" className="w-full">
            <MessageCircle size={16} /> WhatsApp
          </Boton>
        </a>
        <a href={`tel:${c.telefono.replace(/\s/g, '')}`}>
          <Boton variante="suave" aria-label="Llamar">
            <Phone size={16} />
          </Boton>
        </a>
        <Boton onClick={onEditar}>
          <Pencil size={16} /> Editar
        </Boton>
      </div>
    </Modal>
  );
}

function FormCuidadora({ inicial, onClose, onGuardada }: { inicial: Cuidadora; onClose: () => void; onGuardada: (id: string) => void }) {
  const { db, upsert } = useStore();
  const [f, setF] = useState<Cuidadora>(inicial);
  const set = (p: Partial<Cuidadora>) => setF((x) => ({ ...x, ...p }));
  const existe = db.cuidadoras.some((c) => c.id === f.id);
  const toggle = (r: string) => set({ rasgos: f.rasgos.includes(r) ? f.rasgos.filter((x) => x !== r) : [...f.rasgos, r] });

  return (
    <Modal titulo={existe ? 'Editar cuidadora' : 'Nueva cuidadora'} onClose={onClose} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar c={{ nombre: f.nombre || '?', color: f.color }} size={56} />
          <div className="flex flex-wrap gap-2">
            {COLORES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set({ color: k })}
                className={cx('size-7 rounded-full border-2 transition', f.color === k ? 'border-tinta ring-2 ring-tinta/20' : 'border-white')}
                style={{ background: PALETA[k].dot }}
                aria-label={k}
              />
            ))}
          </div>
        </div>
        <Campo label="Nombre completo">
          <input className={inputCls} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej: Ana María González" autoFocus />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Fecha de nacimiento" ayuda={f.fechaNacimiento ? `${edad(f.fechaNacimiento)} años` : undefined}>
            <input type="date" className={inputCls} value={f.fechaNacimiento} onChange={(e) => set({ fechaNacimiento: e.target.value })} />
          </Campo>
          <Campo label="Años de experiencia">
            <input type="number" min={0} className={inputCls} value={f.experiencia} onChange={(e) => set({ experiencia: Number(e.target.value) })} />
          </Campo>
          <Campo label="Valor por hora (CLP)">
            <input type="number" min={0} step={100} className={inputCls} value={f.tarifaHora} onChange={(e) => set({ tarifaHora: Number(e.target.value) })} />
          </Campo>
        </div>
        <Campo label="Teléfono (WhatsApp)">
          <input className={inputCls} value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} inputMode="tel" />
        </Campo>
        <Campo label="Tu valoración">
          <Estrellas valor={f.valoracion} onChange={(v) => set({ valoracion: v })} size={28} />
        </Campo>
        <Campo label="¿Cómo es? (toca para marcar)">
          <div className="flex flex-wrap gap-1.5">
            {RASGOS.map((r) => (
              <Rasgo key={r.nombre} nombre={r.nombre} activo={f.rasgos.includes(r.nombre)} onClick={() => toggle(r.nombre)} />
            ))}
          </div>
        </Campo>
        <Campo label="Descripción">
          <textarea className={cx(inputCls, 'min-h-20')} value={f.descripcion} onChange={(e) => set({ descripcion: e.target.value })} placeholder="Estudios, con qué pacientes le va mejor, disponibilidad…" />
        </Campo>
        <Campo label="Notas privadas (solo tú las ves)">
          <textarea className={cx(inputCls, 'min-h-16')} value={f.notas} onChange={(e) => set({ notas: e.target.value })} />
        </Campo>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" className="size-5" checked={f.activa} onChange={(e) => set({ activa: e.target.checked })} /> Activa en el equipo
        </label>
        <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-linea bg-white px-5 py-3">
        <Boton
          className="w-full"
          disabled={!f.nombre.trim()}
          onClick={() => {
            upsert('cuidadoras', { ...f, nombre: f.nombre.trim() });
            onGuardada(f.id);
          }}
        >
          Guardar
        </Boton>
        </div>
      </div>
    </Modal>
  );
}
