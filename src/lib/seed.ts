import type { Asignacion, Cliente, Cuidadora, DB, Movimiento, Persona, Piso, Sede, Turno } from './types';
import { hoy, lunesDe, moverQuincena, quincenaDe, sumarDias, uid } from './fechas';
import { horario, resumenPeriodo } from './calculos';

export const TURNOS_BASE: Turno[] = [
  {
    id: 'dia', nombre: 'Día', icono: 'manana', inicio: '08:00', fin: '20:00', color: 'ambar', requeridas: 5,
    excepcion: { dia: 6, inicio: '09:00', fin: '20:00' }, // domingo parte a las 9
  },
  {
    id: 'noche', nombre: 'Noche', icono: 'noche', inicio: '20:00', fin: '08:00', color: 'violeta', requeridas: 3,
    excepcion: { dia: 5, inicio: '20:00', fin: '09:00' }, // la noche del sábado entrega a las 9 del domingo
  },
];

// Sedes de ACALI (son datos reales de la empresa: se cargan siempre, también en blanco)
export const SEDES_ACALI: Sede[] = ['Dominico', 'Candil', 'Tranqueras', 'Arturo Medina', 'Coventri', 'Errazuriz', 'La Florida', 'Valle Alegre']
  .map((nombre) => ({ id: nombre.toLowerCase().replace(/ /g, '-'), nombre }));

export const PISOS_BASE: Piso[] = [
  { id: 'p1', nombre: 'Piso 1', sedeId: 'dominico' },
  { id: 'p2', nombre: 'Piso 2', sedeId: 'dominico' },
  { id: 'p3', nombre: 'Piso 1', sedeId: 'candil' },
  { id: 'p4', nombre: 'Piso 2', sedeId: 'candil' },
];

// Clientes = apoderados que contratan y pagan
export const CLIENTES_BASE: Cliente[] = [
  { id: 'k1', sedeId: 'dominico', nombre: 'Carolina Larraín', telefono: '+56 9 5555 0201', cobroSemanal: 1180000, activo: true },
  { id: 'k2', sedeId: 'dominico', nombre: 'Jorge Pérez', telefono: '+56 9 5555 0202', cobroSemanal: 640000, activo: true },
  { id: 'k3', sedeId: 'dominico', nombre: 'Marcela Ibáñez', telefono: '+56 9 5555 0203', cobroSemanal: 1120000, activo: true },
  { id: 'k4', sedeId: 'dominico', nombre: 'Andrés Morales', telefono: '+56 9 5555 0204', cobroSemanal: 560000, activo: true },
  { id: 'k5', sedeId: 'candil', nombre: 'Patricia Soto', telefono: '+56 9 5555 0205', cobroSemanal: 1080000, activo: true },
  { id: 'k6', sedeId: 'candil', nombre: 'Rodrigo Vera', telefono: '+56 9 5555 0206', cobroSemanal: 620000, activo: true },
];

// Personas cuidadas (adultos mayores), cada una a cargo de un cliente
export const PERSONAS_BASE: Persona[] = [
  { id: 'r1', clienteId: 'k1', nombre: 'Inés Larraín', pisoId: 'p1', fechaNacimiento: '1938-04-02', cuidados: 'Alzheimer moderado. Se desorienta de noche.', requeridas: { dia: 1, noche: 1 }, activa: true },
  { id: 'r2', clienteId: 'k2', nombre: 'Hernán Pérez', pisoId: 'p1', fechaNacimiento: '1941-09-15', cuidados: 'Diabético, insulina 8:00 y 20:00. Camina con andador.', requeridas: { dia: 1, noche: 0 }, activa: true },
  { id: 'r3', clienteId: 'k3', nombre: 'Olga Ibáñez', pisoId: 'p2', fechaNacimiento: '1935-12-08', cuidados: 'Postrada. Cambio de posición cada 2 horas.', requeridas: { dia: 1, noche: 1 }, activa: true },
  { id: 'r4', clienteId: 'k4', nombre: 'Teresa Morales', pisoId: 'p2', fechaNacimiento: '1944-06-21', cuidados: 'Autovalente. Apoyo en ducha y comidas.', requeridas: { dia: 1, noche: 0 }, activa: true },
  { id: 'r5', clienteId: 'k5', nombre: 'Raúl Soto', pisoId: 'p3', fechaNacimiento: '1939-02-27', cuidados: 'Parkinson. Riesgo de caídas.', requeridas: { dia: 1, noche: 1 }, activa: true },
  { id: 'r6', clienteId: 'k6', nombre: 'Elena Vera', pisoId: 'p4', fechaNacimiento: '1942-08-19', cuidados: 'Apoyo en comidas y paseo diario.', requeridas: { dia: 1, noche: 0 }, activa: true },
];

type Base = Omit<Cuidadora, 'id' | 'activa' | 'notas' | 'telefono'> & { notas?: string };
const c = (n: number, b: Base): Cuidadora => ({
  id: `c${n}`, activa: true, telefono: `+56 9 5555 01${String(n).padStart(2, '0')}`, ...b, notas: b.notas ?? '',
});

const CUIDADORAS: Cuidadora[] = [
  c(1, { area: 'piso', sedeId: 'dominico', nombre: 'María José Fuentes', fechaNacimiento: '1979-03-14', experiencia: 12, descripcion: 'Técnico en enfermería. Maneja medicamentos y curaciones. Muy buen trato con pacientes con demencia.', rasgos: ['Amable', 'Puntual', 'Cariñosa', 'Primeros auxilios'], valoracion: 5, valorTurno: 54000, valorHoraExtra: 5500, color: 'teja', notas: 'La familia Larraín la pide siempre.' }),
  c(2, { area: 'piso', sedeId: 'dominico', nombre: 'Rosa Elena Muñoz', fechaNacimiento: '1972-01-30', experiencia: 15, descripcion: 'Paciente y ordenada. Cocina para dietas especiales (diabéticos, blanda).', rasgos: ['Paciente', 'Cariñosa', 'Puntual', 'Cocina rico'], valoracion: 5, valorTurno: 58000, valorHoraExtra: 5800, color: 'ambar' }),
  c(3, { area: 'piso', sedeId: 'dominico', nombre: 'Valentina Rojas', fechaNacimiento: '1998-07-22', experiencia: 3, descripcion: 'Estudiante de TENS. Alegre, a los pacientes les gusta conversar con ella.', rasgos: ['Amable', 'Conversadora', 'Impuntual'], valoracion: 3, valorTurno: 46000, valorHoraExtra: 4800, color: 'verde', notas: 'Llega 10-15 min tarde seguido. Ya se lo comenté.' }),
  c(4, { area: 'piso', sedeId: 'dominico', nombre: 'Javiera Contreras', fechaNacimiento: '1990-10-12', experiencia: 6, descripcion: 'Disponible para reemplazos de última hora. Contesta rápido.', rasgos: ['Responsable', 'Seria', 'Ordenada'], valoracion: 4, valorTurno: 50000, valorHoraExtra: 5200, color: 'azul' }),
  c(5, { area: 'piso', sedeId: 'dominico', nombre: 'Patricia Díaz', fechaNacimiento: '1983-05-05', experiencia: 9, descripcion: 'Buena con pacientes con movilidad reducida y traslados.', rasgos: ['Amable', 'Olvidadiza', 'Mucho celular'], valoracion: 3, valorTurno: 48000, valorHoraExtra: 5000, color: 'gris', notas: 'Se le olvidó anotar los remedios una vez. Recordarle la libreta.' }),
  c(6, { area: 'piso', sedeId: 'candil', nombre: 'Luisa Herrera', fechaNacimiento: '1976-11-02', experiencia: 18, descripcion: 'Auxiliar de enfermería con experiencia en postoperatorios.', rasgos: ['Responsable', 'Puntual', 'Primeros auxilios'], valoracion: 5, valorTurno: 58000, valorHoraExtra: 5800, color: 'verde' }),
  c(7, { area: 'piso', sedeId: 'dominico', nombre: 'Carmen Gloria Soto', fechaNacimiento: '1968-10-09', experiencia: 20, descripcion: 'La más experimentada del equipo. Ideal para noches: tranquila y muy atenta.', rasgos: ['Seria', 'Responsable', 'Puntual', 'Tranquila'], valoracion: 4, valorTurno: 60000, valorHoraExtra: 6000, color: 'violeta', notas: 'Poco conversadora, pero nunca ha fallado una noche.' }),
  c(8, { area: 'piso', sedeId: 'dominico', nombre: 'Ana Beltrán', fechaNacimiento: '1985-06-18', experiencia: 7, descripcion: 'Prefiere noches. Siempre pendiente de los pacientes.', rasgos: ['Tranquila', 'Responsable'], valoracion: 4, valorTurno: 55000, valorHoraExtra: 5600, color: 'azul' }),
  c(9, { area: 'piso', sedeId: 'dominico', nombre: 'Gladys Pizarro', fechaNacimiento: '1970-02-25', experiencia: 14, descripcion: 'Experiencia en cuidados paliativos.', rasgos: ['Paciente', 'Cariñosa', 'Seria'], valoracion: 5, valorTurno: 60000, valorHoraExtra: 6000, color: 'teja' }),
  c(10, { area: 'piso', sedeId: 'candil', nombre: 'Marcela Vidal', fechaNacimiento: '1992-09-01', experiencia: 4, descripcion: 'Ayuda con aseo y movilización.', rasgos: ['Amable', 'Impuntual'], valoracion: 3, valorTurno: 50000, valorHoraExtra: 5200, color: 'ambar' }),
  c(11, { area: 'piso', sedeId: 'candil', nombre: 'Sonia Araya', fechaNacimiento: '1974-04-11', experiencia: 11, descripcion: 'Noches y fines de semana.', rasgos: ['Puntual', 'Tranquila', 'Ordenada'], valoracion: 4, valorTurno: 55000, valorHoraExtra: 5600, color: 'gris' }),
  c(12, { area: 'piso', sedeId: 'candil', nombre: 'Daniela Fuentes', fechaNacimiento: '1995-12-20', experiencia: 2, descripcion: 'En formación. Apoya los sábados y reemplazos.', rasgos: ['Amable', 'Conversadora'], valoracion: 3, valorTurno: 45000, valorHoraExtra: 4800, color: 'violeta' }),
  c(13, { area: 'piso', sedeId: 'dominico', nombre: 'Paula Ortiz', fechaNacimiento: '1988-03-03', experiencia: 5, descripcion: 'Técnico en enfermería.', rasgos: ['Responsable', 'Amable'], valoracion: 4, valorTurno: 50000, valorHoraExtra: 5000, color: 'azul' }),
  c(14, { area: 'piso', sedeId: 'candil', nombre: 'Lorena Castro', fechaNacimiento: '1981-07-14', experiencia: 8, descripcion: 'Buena con pacientes postrados.', rasgos: ['Paciente', 'Puntual'], valoracion: 4, valorTurno: 54000, valorHoraExtra: 5500, color: 'verde' }),
  c(15, { area: 'cocina', sedeId: 'dominico', nombre: 'Rosario Tapia', fechaNacimiento: '1975-02-11', experiencia: 16, descripcion: 'Cocina para dietas especiales.', rasgos: ['Ordenada', 'Cocina rico'], valoracion: 5, valorTurno: 42000, valorHoraExtra: 4500, color: 'ambar' }),
  c(16, { area: 'aseo', sedeId: 'dominico', nombre: 'Juana Reyes', fechaNacimiento: '1979-09-23', experiencia: 10, descripcion: 'Aseo de piezas y áreas comunes.', rasgos: ['Ordenada', 'Puntual'], valoracion: 4, valorTurno: 38000, valorHoraExtra: 4000, color: 'gris' }),
  c(17, { area: 'cocina', sedeId: 'candil', nombre: 'Teresa Lagos', fechaNacimiento: '1970-12-02', experiencia: 20, descripcion: 'Encargada de cocina.', rasgos: ['Responsable', 'Cocina rico'], valoracion: 4, valorTurno: 42000, valorHoraExtra: 4500, color: 'teja' }),
  c(18, { area: 'aseo', sedeId: 'candil', nombre: 'Nora Silva', fechaNacimiento: '1986-05-30', experiencia: 6, descripcion: 'Aseo y lavandería.', rasgos: ['Tranquila'], valoracion: 3, valorTurno: 38000, valorHoraExtra: 4000, color: 'violeta' }),
  c(19, { area: 'piso', emergencia: true, nombre: 'Camila Rivas', fechaNacimiento: '1993-04-08', experiencia: 5, descripcion: 'Personal de emergencia: cubre cualquier sede con poco aviso.', rasgos: ['Responsable', 'Primeros auxilios'], valoracion: 5, valorTurno: 65000, valorHoraExtra: 7000, color: 'azul' }),
  c(20, { area: 'piso', particular: true, sedeId: 'dominico', nombre: 'Isabel Núñez', fechaNacimiento: '1984-01-17', experiencia: 9, descripcion: 'Atención particular.', rasgos: ['Amable', 'Cariñosa'], valoracion: 4, valorTurno: 52000, valorHoraExtra: 5000, color: 'verde' }),
];

// Cada equipo rota entre sus puestos (residentes de una sede)
const EQUIPOS: { turno: 'dia' | 'noche'; personal: string[]; puestos: string[] }[] = [
  { turno: 'dia', personal: ['c1', 'c2', 'c3', 'c4', 'c5', 'c13'], puestos: ['r1', 'r2', 'r3', 'r4'] },
  { turno: 'noche', personal: ['c7', 'c8', 'c9'], puestos: ['r1', 'r3'] },
  { turno: 'dia', personal: ['c6', 'c12', 'c14'], puestos: ['r5', 'r6'] },
  { turno: 'noche', personal: ['c10', 'c11'], puestos: ['r5'] },
];
// Cocina y Aseo: de día, de lunes a sábado
const OTRAS_AREAS: [string, string][] = [['c15', 'dominico'], ['c16', 'dominico'], ['c17', 'candil'], ['c18', 'candil']];

export function crearSeed(): DB {
  const h = hoy();
  const lunes = lunesDe(h);
  const horaActual = new Date().getHours();
  const asignaciones: Asignacion[] = [];
  const dia = TURNOS_BASE[0];
  const turno = (id: string) => TURNOS_BASE.find((t) => t.id === id)!;

  for (const semana of [-6, -5, -4, -3, -2, -1, 0, 1]) {
    for (let d = 0; d < 7; d++) {
      const n = (semana + 10) * 7 + d; // contador estable para rotar
      const fecha = sumarDias(lunes, semana * 7 + d);
      for (const { turno: tid, personal, puestos } of EQUIPOS) {
        const t: Turno = turno(tid);
        puestos.forEach((personaId, i) => {
          // Cupos sin cubrir la próxima semana para que se vea la alerta
          if (semana === 1 && ((d === 3 && personaId === 'r4' && tid === 'dia') || (d === 5 && personaId === 'r5' && tid === 'noche'))) return;
          const cid = personal[(n + i) % personal.length];
          let estado: Asignacion['estado'] = 'programado';
          if (fecha < h) {
            estado = 'asistio';
            if ((cid === 'c3' || cid === 'c10') && (n + i) % 3 === 0) estado = 'atraso';
            if (cid === 'c5' && semana === -1 && d === 2) estado = 'falto';
          } else if (fecha === h && tid === 'dia' && horaActual >= 9) {
            estado = cid === 'c3' ? 'atraso' : 'asistio';
          }
          // Algunas horas extra de ejemplo
          const horasExtra = fecha < h && (n + i) % 11 === 0 ? 2 : undefined;
          asignaciones.push({ id: uid(), fecha, turnoId: tid, personaId, cuidadoraId: cid, ...horario(t, fecha), estado, horasExtra });
        });
      }
      if (d < 6) {
        for (const [cid, sedeId] of OTRAS_AREAS) {
          asignaciones.push({ id: uid(), fecha, turnoId: 'dia', sedeId, cuidadoraId: cid, ...horario(dia, fecha), estado: fecha < h ? 'asistio' : 'programado' });
        }
      }
      // Refuerzo de personal de emergencia los martes
      if (d === 1) asignaciones.push({ id: uid(), fecha, turnoId: 'dia', personaId: 'r2', cuidadoraId: 'c19', ...horario(dia, fecha), estado: fecha < h ? 'asistio' : 'programado', nota: 'Refuerzo de emergencia' });
    }
  }

  const movimientos: Movimiento[] = [];
  for (const semana of [-6, -5, -4, -3, -2, -1, 0]) {
    const lun = sumarDias(lunes, semana * 7);
    const add = (d: number, m: Omit<Movimiento, 'id' | 'fecha'>) => {
      const fecha = sumarDias(lun, d);
      if (fecha <= h) movimientos.push({ id: uid(), fecha, ...m });
    };
    for (const [i, k] of CLIENTES_BASE.entries()) add(i, { sedeId: k.sedeId, tipo: 'ingreso', concepto: 'Servicio de cuidado semanal', cliente: k.nombre, monto: k.cobroSemanal, medio: 'transferencia' });
    if (semana % 2 === 0) add(3, { sedeId: 'dominico', tipo: 'gasto', concepto: 'Insumos (guantes, pañales, alcohol gel)', monto: 58000, medio: 'efectivo' });
    add(4, { sedeId: 'dominico', tipo: 'gasto', concepto: 'Movilización cuidadoras', monto: 42000, medio: 'efectivo' });
    if (semana === -2) add(2, { sedeId: 'dominico', tipo: 'gasto', concepto: 'Uniformes', monto: 96000, medio: 'transferencia' });
  }

  const db: DB = { cuidadoras: CUIDADORAS, turnos: TURNOS_BASE, sedes: SEDES_ACALI, pisos: PISOS_BASE, clientes: CLIENTES_BASE, personas: PERSONAS_BASE, asignaciones, pagos: [], movimientos, ajustes: { nombreDuena: 'Leris' } };

  // Quincenas ya terminadas: pagadas; emergencia: pagada cada día
  for (let d = quincenaDe(sumarDias(lunes, -42)).desde; quincenaDe(d).hasta < h; d = moverQuincena(d, 1)) {
    const q = quincenaDe(d);
    for (const cu of CUIDADORAS.filter((x) => !x.emergencia)) {
      const r = resumenPeriodo(db, cu.id, q.desde, q.hasta, q.clave);
      if (r.turnos) db.pagos.push({ id: uid(), cuidadoraId: cu.id, periodo: q.clave, ajuste: 0, monto: r.subtotal, pagadoEl: q.hasta });
    }
  }
  for (const a of asignaciones.filter((x) => x.cuidadoraId === 'c19' && x.fecha < h)) {
    const clave = `d:${a.fecha}`;
    db.pagos.push({ id: uid(), cuidadoraId: 'c19', periodo: clave, ajuste: 0, monto: resumenPeriodo(db, 'c19', a.fecha, a.fecha, clave).subtotal, pagadoEl: a.fecha });
  }
  return db;
}

export const dbVacia = (): DB => ({
  cuidadoras: [], turnos: TURNOS_BASE, sedes: SEDES_ACALI, pisos: [], clientes: [], personas: [], asignaciones: [], pagos: [], movimientos: [], ajustes: { nombreDuena: 'Leris' },
});
