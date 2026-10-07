import type { Asignacion, Cuidadora, DB, Movimiento, Turno } from './types';
import { hoy, lunesDe, sumarDias, uid } from './fechas';
import { horario, resumenSemana } from './calculos';

export const TURNOS_BASE: Turno[] = [
  {
    id: 'dia', nombre: 'Día', icono: 'manana', inicio: '08:00', fin: '20:00', color: 'ambar', requeridas: 4,
    excepcion: { dia: 6, inicio: '09:00', fin: '20:00' }, // domingo parte a las 9
  },
  {
    id: 'noche', nombre: 'Noche', icono: 'noche', inicio: '20:00', fin: '08:00', color: 'violeta', requeridas: 3,
    excepcion: { dia: 5, inicio: '20:00', fin: '09:00' }, // la noche del sábado entrega a las 9 del domingo
  },
];

type Base = Omit<Cuidadora, 'id' | 'activa' | 'notas' | 'telefono'> & { notas?: string };
const c = (n: number, b: Base): Cuidadora => ({
  id: `c${n}`, activa: true, telefono: `+56 9 5555 01${String(n).padStart(2, '0')}`, ...b, notas: b.notas ?? '',
});

const CUIDADORAS: Cuidadora[] = [
  c(1, { nombre: 'María José Fuentes', fechaNacimiento: '1979-03-14', experiencia: 12, descripcion: 'Técnico en enfermería. Maneja medicamentos y curaciones. Muy buen trato con pacientes con demencia.', rasgos: ['Amable', 'Puntual', 'Cariñosa', 'Primeros auxilios'], valoracion: 5, tarifaHora: 4500, color: 'teja', notas: 'La familia Larraín la pide siempre.' }),
  c(2, { nombre: 'Rosa Elena Muñoz', fechaNacimiento: '1972-01-30', experiencia: 15, descripcion: 'Paciente y ordenada. Cocina para dietas especiales (diabéticos, blanda).', rasgos: ['Paciente', 'Cariñosa', 'Puntual', 'Cocina rico'], valoracion: 5, tarifaHora: 4800, color: 'ambar' }),
  c(3, { nombre: 'Valentina Rojas', fechaNacimiento: '1998-07-22', experiencia: 3, descripcion: 'Estudiante de TENS. Alegre, a los pacientes les gusta conversar con ella.', rasgos: ['Amable', 'Conversadora', 'Impuntual'], valoracion: 3, tarifaHora: 3800, color: 'verde', notas: 'Llega 10-15 min tarde seguido. Ya se lo comenté.' }),
  c(4, { nombre: 'Javiera Contreras', fechaNacimiento: '1990-10-12', experiencia: 6, descripcion: 'Disponible para reemplazos de última hora. Contesta rápido.', rasgos: ['Responsable', 'Seria', 'Ordenada'], valoracion: 4, tarifaHora: 4200, color: 'azul' }),
  c(5, { nombre: 'Patricia Díaz', fechaNacimiento: '1983-05-05', experiencia: 9, descripcion: 'Buena con pacientes con movilidad reducida y traslados.', rasgos: ['Amable', 'Olvidadiza', 'Mucho celular'], valoracion: 3, tarifaHora: 4000, color: 'gris', notas: 'Se le olvidó anotar los remedios una vez. Recordarle la libreta.' }),
  c(6, { nombre: 'Luisa Herrera', fechaNacimiento: '1976-11-02', experiencia: 18, descripcion: 'Auxiliar de enfermería con experiencia en postoperatorios.', rasgos: ['Responsable', 'Puntual', 'Primeros auxilios'], valoracion: 5, tarifaHora: 4800, color: 'verde' }),
  c(7, { nombre: 'Carmen Gloria Soto', fechaNacimiento: '1968-10-09', experiencia: 20, descripcion: 'La más experimentada del equipo. Ideal para noches: tranquila y muy atenta.', rasgos: ['Seria', 'Responsable', 'Puntual', 'Tranquila'], valoracion: 4, tarifaHora: 5000, color: 'violeta', notas: 'Poco conversadora, pero nunca ha fallado una noche.' }),
  c(8, { nombre: 'Ana Beltrán', fechaNacimiento: '1985-06-18', experiencia: 7, descripcion: 'Prefiere noches. Siempre pendiente de los pacientes.', rasgos: ['Tranquila', 'Responsable'], valoracion: 4, tarifaHora: 4600, color: 'azul' }),
  c(9, { nombre: 'Gladys Pizarro', fechaNacimiento: '1970-02-25', experiencia: 14, descripcion: 'Experiencia en cuidados paliativos.', rasgos: ['Paciente', 'Cariñosa', 'Seria'], valoracion: 5, tarifaHora: 5000, color: 'teja' }),
  c(10, { nombre: 'Marcela Vidal', fechaNacimiento: '1992-09-01', experiencia: 4, descripcion: 'Ayuda con aseo y movilización.', rasgos: ['Amable', 'Impuntual'], valoracion: 3, tarifaHora: 4200, color: 'ambar' }),
  c(11, { nombre: 'Sonia Araya', fechaNacimiento: '1974-04-11', experiencia: 11, descripcion: 'Noches y fines de semana.', rasgos: ['Puntual', 'Tranquila', 'Ordenada'], valoracion: 4, tarifaHora: 4600, color: 'gris' }),
  c(12, { nombre: 'Daniela Fuentes', fechaNacimiento: '1995-12-20', experiencia: 2, descripcion: 'En formación. Apoya los sábados y reemplazos.', rasgos: ['Amable', 'Conversadora'], valoracion: 3, tarifaHora: 3600, color: 'violeta' }),
];

// Equipo de día rota entre c1..c6 (+ c12 de apoyo); equipo de noche entre c7..c11.
const EQUIPO_DIA = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const EQUIPO_NOCHE = ['c7', 'c8', 'c9', 'c10', 'c11'];

export function crearSeed(): DB {
  const h = hoy();
  const lunes = lunesDe(h);
  const horaActual = new Date().getHours();
  const asignaciones: Asignacion[] = [];
  const [dia, noche] = TURNOS_BASE;

  for (const semana of [-6, -5, -4, -3, -2, -1, 0, 1]) {
    for (let d = 0; d < 7; d++) {
      const n = (semana + 10) * 7 + d; // contador estable para rotar
      const fecha = sumarDias(lunes, semana * 7 + d);
      const plan: [Turno, string[]][] = [
        [dia, [0, 1, 2, 3].map((k) => EQUIPO_DIA[(n + k) % 6])],
        [noche, [0, 1, 2].map((k) => EQUIPO_NOCHE[(n * 2 + k) % 5])],
      ];
      if (d === 5) plan[0][1].push('c12'); // Daniela apoya los sábados

      for (const [t, ids] of plan) {
        ids.forEach((cid, i) => {
          // Cupos sin cubrir la próxima semana para que se vea la alerta
          if (semana === 1 && ((d === 3 && t.id === 'dia' && i === 3) || (d === 5 && t.id === 'noche' && i === 2))) return;
          let estado: Asignacion['estado'] = 'programado';
          if (fecha < h) {
            estado = 'asistio';
            if ((cid === 'c3' || cid === 'c10') && (n + i) % 3 === 0) estado = 'atraso';
            if (cid === 'c5' && semana === -1 && d === 2) estado = 'falto';
          } else if (fecha === h && t.id === 'dia' && horaActual >= 9) {
            estado = cid === 'c3' ? 'atraso' : 'asistio';
          }
          asignaciones.push({ id: uid(), fecha, turnoId: t.id, cuidadoraId: cid, ...horario(t, fecha), estado });
        });
      }
    }
  }
  // Ejemplo de horas sueltas: reemplazo corto de 4 horas
  asignaciones.push({
    id: uid(), fecha: sumarDias(lunes, -5), turnoId: 'dia', cuidadoraId: 'c12', inicio: '16:00', fin: '20:00',
    estado: 'asistio', nota: 'Reemplazo de Patricia (horas sueltas)',
  });

  const FAMILIAS: [string, number, number][] = [
    ['Familia Larraín (Sra. Inés)', 0, 1180000],
    ['Familia Pérez (Don Hernán)', 1, 960000],
    ['Familia Ibáñez (Sra. Olga)', 2, 880000],
    ['Familia Soto (Don Raúl)', 3, 720000],
    ['Familia Morales (Sra. Teresa)', 4, 640000],
  ];
  const movimientos: Movimiento[] = [];
  for (const semana of [-6, -5, -4, -3, -2, -1, 0]) {
    const lun = sumarDias(lunes, semana * 7);
    const add = (d: number, m: Omit<Movimiento, 'id' | 'fecha'>) => {
      const fecha = sumarDias(lun, d);
      if (fecha <= h) movimientos.push({ id: uid(), fecha, ...m });
    };
    for (const [cliente, d, monto] of FAMILIAS) add(d, { tipo: 'ingreso', concepto: 'Servicio de cuidado semanal', cliente, monto, medio: 'transferencia' });
    if (semana % 2 === 0) add(3, { tipo: 'gasto', concepto: 'Insumos (guantes, pañales, alcohol gel)', monto: 58000, medio: 'efectivo' });
    add(4, { tipo: 'gasto', concepto: 'Movilización cuidadoras', monto: 42000, medio: 'efectivo' });
    if (semana === -2) add(2, { tipo: 'gasto', concepto: 'Uniformes', monto: 96000, medio: 'transferencia' });
  }

  const db: DB = { cuidadoras: CUIDADORAS, turnos: TURNOS_BASE, asignaciones, pagos: [], movimientos, ajustes: { nombreDuena: '' } };

  // Semanas anteriores ya pagadas el domingo
  for (const semana of [-6, -5, -4, -3, -2, -1]) {
    const lun = sumarDias(lunes, semana * 7);
    for (const cu of CUIDADORAS) {
      const r = resumenSemana(db, cu.id, lun);
      if (!r.turnos) continue;
      const ajuste = cu.id === 'c7' && semana === -2 ? 20000 : 0;
      db.pagos.push({ id: uid(), cuidadoraId: cu.id, semana: lun, ajuste, monto: r.subtotal + ajuste, pagadoEl: sumarDias(lun, 6) });
    }
  }
  return db;
}

export const dbVacia = (): DB => ({
  cuidadoras: [], turnos: TURNOS_BASE, asignaciones: [], pagos: [], movimientos: [], ajustes: { nombreDuena: '' },
});
