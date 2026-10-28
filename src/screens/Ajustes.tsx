import { Moon, Plus, Sparkles, Sun, SunMoon, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { IconoTurno, Turno } from '../lib/types';
import { DIAS_CORTOS, duracion, fmtHoras, uid } from '../lib/fechas';
import { COLORES, PALETA } from '../lib/colores';
import { requeridasTurno } from '../lib/calculos';
import { Boton, Campo, Card, OPCIONES_ICONO, Segmentado, Titulo, TurnoIcono, cx, inputCls } from '../components/ui';
import { useTema, type Tema } from '../lib/tema';


const DIAS_LARGOS =['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function Ajustes() {
  const { db, upsert, remove, setAjustes, reiniciar } = useStore();
  const { tema, setTema } = useTema();

  const editarTurno = (t: Turno, p: Partial<Turno>) => upsert('turnos', { ...t, ...p });
  const usados = (id: string) => db.asignaciones.filter((a) => a.turnoId === id).length;

  return (
    <div className="max-w-3xl">
      <Titulo titulo="Ajustes" />

      <Card className="mb-4 space-y-4">
        <Campo label="Tu nombre (para el saludo de inicio)">
          <input className={inputCls} value={db.ajustes.nombreDuena} onChange={(e) => setAjustes({ nombreDuena: e.target.value })} placeholder="Tu nombre" />
        </Campo>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Tema</span>
          <Segmentado<Tema>
            valor={tema}
            onChange={setTema}
            opciones={[
              { id: 'claro', label: <><Sun size={15} /> Claro</> },
              { id: 'oscuro', label: <><Moon size={15} /> Oscuro</> },
              { id: 'auto', label: <><SunMoon size={15} /> Automático</> },
            ]}
          />
          <span className="mt-1 block text-xs text-suave">Automático usa el mismo modo que tu teléfono o computador.</span>
        </div>
      </Card>

      <Card tour="ajustes-turnos" className="mb-4 !p-0">
        <div className="flex items-center justify-between border-b border-linea px-4 py-3">
          <div>
            <h2 className="font-semibold">Turnos</h2>
            <p className="text-sm text-suave">Horario, cuántas cuidadoras necesita cada turno y horario especial de un día.</p>
          </div>
          <Boton
            chico
            variante="suave"
            onClick={() => upsert('turnos', { id: uid(), nombre: 'Nuevo turno', icono: 'reloj', inicio: '10:00', fin: '18:00', color: 'verde', requeridas: 1, excepcion: null })}
          >
            <Plus size={16} /> Agregar
          </Boton>
        </div>
        <div className="divide-y divide-linea">
          {db.turnos.map((t) => (
            <div key={t.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-end gap-2">
                <span className="grid size-10 place-items-center rounded-lg" style={{ background: PALETA[t.color].bg, color: PALETA[t.color].fg }}>
                  <TurnoIcono icono={t.icono} size={18} />
                </span>
                <Campo label="Nombre">
                  <input className={cx(inputCls, '!w-40')} value={t.nombre} onChange={(e) => editarTurno(t, { nombre: e.target.value })} />
                </Campo>
                <Campo label="Desde">
                  <input type="time" className={cx(inputCls, '!w-32')} value={t.inicio} onChange={(e) => e.target.value && editarTurno(t, { inicio: e.target.value })} />
                </Campo>
                <Campo label="Hasta">
                  <input type="time" className={cx(inputCls, '!w-32')} value={t.fin} onChange={(e) => e.target.value && editarTurno(t, { fin: e.target.value })} />
                </Campo>
                <div className="pb-3 text-sm text-suave">{fmtHoras(duracion(t.inicio, t.fin))}</div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <Campo label="Cuidadoras por turno">
                  <div className="py-2.5 text-sm text-suave">
                    <b className="text-tinta">{requeridasTurno(db, t)}</b> en total · se calcula con los residentes (en Clientes)
                  </div>
                </Campo>

                <Campo label="Horario especial">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={cx(inputCls, '!w-36')}
                      value={t.excepcion ? String(t.excepcion.dia) : ''}
                      onChange={(e) =>
                        editarTurno(t, {
                          excepcion: e.target.value === '' ? null : { dia: Number(e.target.value), inicio: t.excepcion?.inicio ?? t.inicio, fin: t.excepcion?.fin ?? t.fin },
                        })
                      }
                    >
                      <option value="">Ninguno</option>
                      {DIAS_LARGOS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                    {t.excepcion && (
                      <>
                        <input type="time" className={cx(inputCls, '!w-32')} value={t.excepcion.inicio} onChange={(e) => e.target.value && editarTurno(t, { excepcion: { ...t.excepcion!, inicio: e.target.value } })} aria-label="Inicio especial" />
                        <input type="time" className={cx(inputCls, '!w-32')} value={t.excepcion.fin} onChange={(e) => e.target.value && editarTurno(t, { excepcion: { ...t.excepcion!, fin: e.target.value } })} aria-label="Fin especial" />
                      </>
                    )}
                  </div>
                </Campo>
              </div>
              {t.excepcion && (
                <p className="-mt-1 text-xs text-suave">
                  Los {DIAS_LARGOS[t.excepcion.dia].toLowerCase()} este turno va de {t.excepcion.inicio} a {t.excepcion.fin} ({fmtHoras(duracion(t.excepcion.inicio, t.excepcion.fin))}).
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <select className={cx(inputCls, '!w-32 !py-1.5 text-sm')} value={t.icono} onChange={(e) => editarTurno(t, { icono: e.target.value as IconoTurno })} aria-label="Ícono">
                    {OPCIONES_ICONO.map((o) => <option key={o.id} value={o.id}>Ícono: {o.label}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5">
                    {COLORES.map((k) => (
                      <button key={k} onClick={() => editarTurno(t, { color: k })} className={cx('size-5 rounded-full border-2', t.color === k ? 'border-tinta' : 'border-white')} style={{ background: PALETA[k].dot }} aria-label={`Color ${k}`} />
                    ))}
                  </div>
                </div>
                <Boton
                  chico
                  variante="peligro"
                  disabled={db.turnos.length <= 1}
                  onClick={() => {
                    const n = usados(t.id);
                    if (n) return alert(`Este turno tiene ${n} asignaciones en el calendario. Cámbialas antes de borrarlo.`);
                    if (confirm(`¿Borrar el turno "${t.nombre}"?`)) remove('turnos', t.id);
                  }}
                >
                  <Trash2 size={16} /> Borrar
                </Boton>
              </div>
            </div>
          ))}
        </div>
        <p className="border-t border-linea px-4 py-2.5 text-xs text-suave">
          Días: {DIAS_CORTOS.join(' · ')}. Los cambios de horario aplican a los turnos que asignes desde ahora.
        </p>
      </Card>

      <Card className="mb-4 !p-0">
        <div className="flex items-center justify-between border-b border-linea px-4 py-3">
          <div>
            <h2 className="font-semibold">Pisos</h2>
            <p className="text-sm text-suave">Los pisos ordenan a los residentes. Cuántas cuidadoras necesita cada uno se define en Clientes.</p>
          </div>
          <Boton chico variante="suave" onClick={() => upsert('pisos', { id: uid(), nombre: `Piso ${db.pisos.length + 1}` })}>
            <Plus size={16} /> Agregar piso
          </Boton>
        </div>
        {db.pisos.length === 0 && <p className="px-4 py-4 text-sm text-suave">Sin pisos.</p>}
        <div className="divide-y divide-linea">
          {db.pisos.map((p) => {
            const n = db.personas.filter((k) => k.pisoId === p.id).length;
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <input className={cx(inputCls, '!w-48')} value={p.nombre} onChange={(e) => upsert('pisos', { ...p, nombre: e.target.value })} aria-label="Nombre del piso" />
                <span className="text-sm text-suave">{n} residente{n === 1 ? "" : "s"}</span>
                <Boton
                  chico
                  variante="peligro"
                  className="ml-auto"
                  onClick={() => {
                    if (confirm(n ? `${p.nombre} tiene ${n} residentes; quedarán "Sin piso". ¿Borrar igual?` : `¿Borrar ${p.nombre}?`)) remove('pisos', p.id);
                  }}
                >
                  <Trash2 size={16} />
                </Boton>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Datos</h2>
        <p className="mb-3 text-sm text-suave">
          La app parte en blanco. Puedes llenarla con datos de ejemplo para mostrarla o practicar, y volver a dejarla en blanco cuando quieras. Por ahora la información se guarda solo en este equipo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Boton chico variante="suave" onClick={() => confirm('¿Llenar con datos de ejemplo? Se reemplaza lo que hayas ingresado.') && reiniciar('demo')}>
            <Sparkles size={16} /> Llenar con datos de ejemplo
          </Boton>
          <Boton chico variante="fantasma" onClick={() => confirm('¿Dejar la app en blanco? Se borra todo lo ingresado.') && reiniciar('vacio')}>
            <Trash2 size={16} /> Dejar en blanco
          </Boton>
        </div>
      </Card>
    </div>
  );
}
