import { useState } from 'react';
import { MessageCircle, Pencil, Phone, Search, UserPlus } from 'lucide-react';
import { useStore } from '../state/store';
import type { Cuidadora } from '../lib/types';
import { ESTADOS, RASGOS } from '../lib/types';
import { clp, edad, fmtDia, fmtHora, fmtHoras } from '../lib/fechas';
import { estadisticas, linkWhatsApp } from '../lib/calculos';
import { COLORES, PALETA } from '../lib/colores';
import { uid } from '../lib/fechas';
import { Avatar, Boton, Campo, Card, Estrellas, Modal, Rasgo, Titulo, TurnoIcono, cx, inputCls, primerNombre } from '../components/ui';

export function Cuidadoras() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [verId, setVerId] = useState<string | null>(null);
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
      <Titulo titulo="Cuidadoras" sub={`${db.cuidadoras.filter((c) => c.activa).length} en el equipo`}>
        <Boton onClick={() => setEditar(nueva())}>
          <UserPlus size={18} /> Nueva
        </Boton>
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-suave" />
          <input className={cx(inputCls, 'pl-11')} placeholder="Buscar por nombre o rasgo (ej: puntual)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {inactivas > 0 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-suave">
            <input type="checkbox" checked={verInactivas} onChange={(e) => setVerInactivas(e.target.checked)} /> Ver inactivas ({inactivas})
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((c) => {
          const s = estadisticas(db, c.id);
          return (
            <Card key={c.id} onClick={() => setVerId(c.id)} className={cx('', !c.activa && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <Avatar c={c} size={56} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{c.nombre}</h3>
                  <p className="text-sm text-suave">
                    {edad(c.fechaNacimiento)} años · {c.experiencia} años de experiencia
                  </p>
                  <Estrellas valor={c.valoracion} size={16} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.rasgos.map((r) => <Rasgo key={r} nombre={r} />)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Asistencia" valor={pct(s.asistencia)} />
                <Mini label="Puntualidad" valor={pct(s.puntualidad)} />
                <Mini label="Valor hora" valor={clp(c.tarifaHora)} />
              </div>
            </Card>
          );
        })}
        {lista.length === 0 && <p className="text-suave">No hay cuidadoras que coincidan.</p>}
      </div>

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
  const turno = (id: string) => db.turnos.find((t) => t.id === id);

  return (
    <Modal titulo="Perfil" onClose={onClose} ancho="max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar c={c} size={64} />
          <div>
            <h2 className="text-xl font-semibold">{c.nombre}</h2>
            <p className="text-sm text-suave">
              {edad(c.fechaNacimiento)} años · {c.experiencia} años de experiencia · {clp(c.tarifaHora)}/hora
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Estrellas valor={c.valoracion} size={16} />
              <span className="text-xs text-suave">Tu valoración</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={linkWhatsApp(c.telefono, `Hola ${primerNombre(c.nombre)}`)} target="_blank" rel="noreferrer">
            <Boton variante="suave" chico>
              <MessageCircle size={16} /> WhatsApp
            </Boton>
          </a>
          <a href={`tel:${c.telefono.replace(/\s/g, '')}`}>
            <Boton variante="suave" chico>
              <Phone size={16} />
            </Boton>
          </a>
          <Boton chico onClick={onEditar}>
            <Pencil size={16} /> Editar
          </Boton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.rasgos.map((r) => <Rasgo key={r} nombre={r} />)}
      </div>
      {c.descripcion && <p className="mt-3 leading-relaxed">{c.descripcion}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Asistencia" valor={pct(s.asistencia)} />
        <Mini label="Puntualidad real" valor={pct(s.puntualidad)} />
        <Mini label="Horas (4 sem.)" valor={fmtHoras(s.horas4)} />
        <Mini label="Total pagado" valor={clp(s.pagado)} />
      </div>
      <p className="mt-2 text-xs text-suave">
        Calculado solo con lo que marcas cada día: {s.asistio} a la hora · {s.atraso} con atraso · {s.falto} faltas.
      </p>

      {c.notas && (
        <div className="mt-4 rounded-lg bg-aviso-50 p-3 text-sm text-aviso">
          <b>Tus notas privadas:</b> {c.notas}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold">Próximos turnos</h3>
          {s.proximos.length === 0 && <p className="text-sm text-suave">Sin turnos asignados.</p>}
          <ul className="space-y-1.5">
            {s.proximos.map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg border border-linea bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">{turno(a.turnoId) && <TurnoIcono icono={turno(a.turnoId)!.icono} size={14} className="text-suave" />} {fmtDia(a.fecha)}</span>
                <span className="text-suave">{fmtHora(a.inicio)}–{fmtHora(a.fin)} h</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Últimos turnos</h3>
          <ul className="space-y-1.5">
            {s.ultimos.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-linea bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">{turno(a.turnoId) && <TurnoIcono icono={turno(a.turnoId)!.icono} size={14} className="text-suave" />} {fmtDia(a.fecha)}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: ESTADOS[a.estado].bg, color: ESTADOS[a.estado].fg }}>
                  {ESTADOS[a.estado].label}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
    </Modal>
  );
}
