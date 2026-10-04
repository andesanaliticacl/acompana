import type { Asignacion, Cuidadora, DB, Movimiento, Turno } from './types';
import { hoy, lunesDe, sumarDias, uid } from './fechas';
import { resumenSemana } from './calculos';

export const TURNOS_BASE: Turno[] = [
  { id: 'manana', nombre: 'Mañana', emoji: '☀️', inicio: '08:00', fin: '14:00', color: 'durazno' },
  { id: 'tarde', nombre: 'Tarde', emoji: '🌇', inicio: '14:00', fin: '20:00', color: 'rosa' },
  { id: 'noche', nombre: 'Noche', emoji: '🌙', inicio: '20:00', fin: '08:00', color: 'lavanda' },
];

const CUIDADORAS: Cuidadora[] = [
  {
    id: 'c1', nombre: 'María José Fuentes', fechaNacimiento: '1979-03-14', experiencia: 12, telefono: '+56 9 5555 0101',
    descripcion: 'Técnico en enfermería. Muy dulce con los abuelitos, maneja bien medicamentos y curaciones.',
    rasgos: ['Amable', 'Puntual', 'Cariñosa', 'Primeros auxilios'], valoracion: 5, tarifaHora: 4500, color: 'rosa', activa: true,
    notas: 'La Sra. Inés la pide siempre. Prefiere turnos de mañana.',
  },
  {
    id: 'c2', nombre: 'Carmen Gloria Soto', fechaNacimiento: '1968-10-09', experiencia: 20, telefono: '+56 9 5555 0102',
    descripcion: 'La más experimentada del equipo. Ideal para noches: tranquila y muy atenta.',
    rasgos: ['Seria', 'Responsable', 'Puntual', 'Tranquila'], valoracion: 4, tarifaHora: 5000, color: 'lavanda', activa: true,
    notas: 'Poco conversadora, pero nunca ha fallado una noche.',
  },
  {
    id: 'c3', nombre: 'Valentina Rojas', fechaNacimiento: '1998-07-22', experiencia: 3, telefono: '+56 9 5555 0103',
    descripcion: 'Estudiante de TENS. Alegre, a los pacientes les encanta conversar con ella.',
    rasgos: ['Amable', 'Conversadora', 'Impuntual'], valoracion: 3, tarifaHora: 3800, color: 'menta', activa: true,
    notas: 'Ojo: llega 10-15 min tarde seguido. Ya se lo comenté.',
  },
  {
    id: 'c4', nombre: 'Rosa Elena Muñoz', fechaNacimiento: '1972-01-30', experiencia: 15, telefono: '+56 9 5555 0104',
    descripcion: 'Paciente y ordenada. Sabe cocinar para dietas especiales (diabéticos, blanda).',
    rasgos: ['Paciente', 'Cariñosa', 'Puntual', 'Cocina rico'], valoracion: 5, tarifaHora: 4800, color: 'durazno', activa: true,
    notas: '',
  },
  {
    id: 'c5', nombre: 'Javiera Contreras', fechaNacimiento: '1990-10-12', experiencia: 6, telefono: '+56 9 5555 0105',
    descripcion: 'Disponible fines de semana y reemplazos de última hora.',
    rasgos: ['Responsable', 'Seria', 'Ordenada'], valoracion: 4, tarifaHora: 4200, color: 'cielo', activa: true,
    notas: 'Buena para reemplazos, contesta rápido el WhatsApp.',
  },
  {
    id: 'c6', nombre: 'Patricia Díaz', fechaNacimiento: '1983-05-05', experiencia: 9, telefono: '+56 9 5555 0106',
    descripcion: 'Hace tardes de fin de semana. Buena con pacientes con movilidad reducida.',
    rasgos: ['Amable', 'Olvidadiza', 'Mucho celular'], valoracion: 3, tarifaHora: 4000, color: 'limon', activa: true,
    notas: 'Se le olvidó anotar los remedios una vez. Recordarle la libreta.',
  },
];

// Quién hace cada turno, de lunes (0) a domingo (6)
const PLAN: Record<string, string[]> = {
  manana: ['c1', 'c4', 'c1', 'c4', 'c1', 'c5', 'c5'],
  tarde: ['c3', 'c3', 'c3', 'c3', 'c3', 'c6', 'c6'],
  noche: ['c2', 'c2', 'c2', 'c2', 'c4', 'c2', 'c4'],
};

export function crearSeed(): DB {
  const h = hoy();
  const lunes = lunesDe(h);
  const horaActual = new Date().getHours();
  const asignaciones: Asignacion[] = [];

  for (const semana of [-6, -5, -4, -3, -2, -1, 0, 1]) {
    for (let d = 0; d < 7; d++) {
      const fecha = sumarDias(lunes, semana * 7 + d);
      for (const t of TURNOS_BASE) {
        // Dejamos un par de turnos sin cubrir la próxima semana para que se vea la alerta
        if (semana === 1 && ((d === 3 && t.id === 'tarde') || (d === 5 && t.id === 'noche'))) continue;
        const cid = PLAN[t.id][d];
        let estado: Asignacion['estado'] = 'programado';
        if (fecha < h) {
          estado = 'asistio';
          if (cid === 'c3' && (d + semana) % 2 === 0) estado = 'atraso';
          if (cid === 'c6' && semana === -1 && d === 5) estado = 'falto';
          if (cid === 'c5' && semana === -2 && d === 6) estado = 'atraso';
        } else if (fecha === h && t.id === 'manana' && horaActual >= 9) {
          estado = 'asistio';
        }
        asignaciones.push({ id: uid(), fecha, turnoId: t.id, cuidadoraId: cid, inicio: t.inicio, fin: t.fin, estado });
      }
    }
  }
  // Ejemplo de "horas sueltas": un reemplazo corto de 3 horas
  asignaciones.push({
    id: uid(), fecha: sumarDias(lunes, -4), turnoId: 'tarde', cuidadoraId: 'c5', inicio: '17:00', fin: '20:00',
    estado: 'asistio', nota: 'Reemplazo de Patricia (horas sueltas)',
  });

  const movimientos: Movimiento[] = [];
  for (const semana of [-6, -5, -4, -3, -2, -1, 0]) {
    const lun = sumarDias(lunes, semana * 7);
    const add = (dia: number, m: Omit<Movimiento, 'id' | 'fecha'>) => {
      const fecha = sumarDias(lun, dia);
      if (fecha <= h) movimientos.push({ id: uid(), fecha, ...m });
    };
    add(0, { tipo: 'ingreso', concepto: 'Cuidado semanal', cliente: 'Familia Larraín (Sra. Inés)', monto: 560000, medio: 'transferencia' });
    add(2, { tipo: 'ingreso', concepto: 'Cuidado semanal', cliente: 'Familia Pérez (Don Hernán)', monto: 480000, medio: 'transferencia' });
    if (semana % 2 === 0) add(3, { tipo: 'gasto', concepto: 'Pañales e insumos', monto: 32000, medio: 'efectivo' });
    if (semana !== -2) add(4, { tipo: 'gasto', concepto: 'Movilización cuidadoras', monto: 18000, medio: 'efectivo' });
    if (semana === -1) add(5, { tipo: 'ingreso', concepto: 'Turno extra fin de semana', cliente: 'Familia Pérez (Don Hernán)', monto: 60000, medio: 'efectivo' });
  }

  const db: DB = {
    cuidadoras: CUIDADORAS,
    turnos: TURNOS_BASE,
    asignaciones,
    pagos: [],
    movimientos,
    ajustes: { nombreDuena: '' },
  };

  // Semanas anteriores ya pagadas el domingo
  for (const semana of [-6, -5, -4, -3, -2, -1]) {
    const lun = sumarDias(lunes, semana * 7);
    for (const c of CUIDADORAS) {
      const r = resumenSemana(db, c.id, lun);
      if (!r.turnos) continue;
      const ajuste = c.id === 'c2' && semana === -2 ? 15000 : 0;
      db.pagos.push({ id: uid(), cuidadoraId: c.id, semana: lun, ajuste, monto: r.subtotal + ajuste, pagadoEl: sumarDias(lun, 6) });
    }
  }
  return db;
}

export const dbVacia = (): DB => ({
  cuidadoras: [], turnos: TURNOS_BASE, asignaciones: [], pagos: [], movimientos: [], ajustes: { nombreDuena: '' },
});
