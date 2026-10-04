import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import type { Turno } from '../lib/types';
import { duracion, fmtHoras, uid } from '../lib/fechas';
import { COLORES, PALETA } from '../lib/colores';
import { Boton, Campo, Card, Titulo, cx, inputCls } from '../components/ui';

const EMOJIS = ['☀️', '🌇', '🌙', '⭐', '🌤️', '🌛', '🕐', '🏥'];

export function Ajustes() {
  const { db, upsert, remove, setAjustes, reiniciar } = useStore();

  const editarTurno = (t: Turno, p: Partial<Turno>) => upsert('turnos', { ...t, ...p });
  const usados = (id: string) => db.asignaciones.filter((a) => a.turnoId === id).length;

  return (
    <div className="max-w-3xl">
      <Titulo titulo="Ajustes" />

      <Card className="mb-4">
        <Campo label="¿Cómo te llamas? (para saludarte)">
          <input className={inputCls} value={db.ajustes.nombreDuena} onChange={(e) => setAjustes({ nombreDuena: e.target.value })} placeholder="Tu nombre" />
        </Campo>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Turnos</h2>
          <Boton
            chico
            variante="suave"
            onClick={() => upsert('turnos', { id: uid(), nombre: 'Nuevo turno', emoji: '⭐', inicio: '10:00', fin: '18:00', color: 'cielo' })}
          >
            <Plus size={16} /> Agregar turno
          </Boton>
        </div>
        <p className="mb-3 text-sm text-suave">Cambia horarios o agrega turnos (ej. "Media jornada"). Las filas del calendario se arman con esta lista.</p>
        <div className="space-y-3">
          {db.turnos.map((t) => (
            <div key={t.id} className="rounded-2xl p-3" style={{ background: PALETA[t.color].bg }}>
              <div className="flex flex-wrap items-end gap-2">
                <select className={cx(inputCls, '!w-16 !px-2')} value={t.emoji} onChange={(e) => editarTurno(t, { emoji: e.target.value })} aria-label="Ícono">
                  {EMOJIS.map((e) => <option key={e}>{e}</option>)}
                </select>
                <input className={cx(inputCls, 'min-w-32 flex-1')} value={t.nombre} onChange={(e) => editarTurno(t, { nombre: e.target.value })} aria-label="Nombre del turno" />
                <input type="time" className={cx(inputCls, '!w-32')} value={t.inicio} onChange={(e) => e.target.value && editarTurno(t, { inicio: e.target.value })} aria-label="Inicio" />
                <input type="time" className={cx(inputCls, '!w-32')} value={t.fin} onChange={(e) => e.target.value && editarTurno(t, { fin: e.target.value })} aria-label="Fin" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {COLORES.map((k) => (
                    <button key={k} onClick={() => editarTurno(t, { color: k })} className={cx('size-6 rounded-full border-2', t.color === k ? 'border-tinta' : 'border-white')} style={{ background: PALETA[k].dot }} aria-label={k} />
                  ))}
                  <span className="ml-2 text-sm font-bold" style={{ color: PALETA[t.color].fg }}>{fmtHoras(duracion(t.inicio, t.fin))}</span>
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
                  <Trash2 size={16} />
                </Boton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="dalmata-suave">
        <h2 className="mb-1 text-xl font-semibold">Datos</h2>
        <p className="mb-3 text-sm text-suave">
          Versión de demostración: la información se guarda solo en este equipo. En la versión final queda en la nube, respaldada y disponible desde el celular y el computador.
        </p>
        <div className="flex flex-wrap gap-2">
          <Boton chico variante="suave" onClick={() => confirm('¿Volver a cargar los datos de ejemplo? Se perderán los cambios.') && reiniciar('demo')}>
            <RotateCcw size={16} /> Datos de ejemplo
          </Boton>
          <Boton chico variante="fantasma" onClick={() => confirm('¿Empezar en blanco? Se borra todo lo de esta demo.') && reiniciar('vacio')}>
            <Trash2 size={16} /> Empezar en blanco
          </Boton>
        </div>
      </Card>
    </div>
  );
}
