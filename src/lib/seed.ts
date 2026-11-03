import { SEDE_PARTICULARES } from './types';
import type { Area, Asignacion, Cliente, Cuidadora, DB, Movimiento, Persona, Piso, Sede, Turno } from './types';
import { COLORES } from './colores';
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
  .map((nombre) => ({ id: nombre.toLowerCase().replace(/ /g, '-'), nombre }))
  .concat({ id: SEDE_PARTICULARES, nombre: 'Particulares' });

/* ───────────── Datos de ejemplo (todo inventado) ───────────── */

const NOMBRES = ['María José', 'Rosa Elena', 'Valentina', 'Javiera', 'Patricia', 'Luisa', 'Carmen Gloria', 'Ana', 'Gladys', 'Marcela', 'Sonia', 'Daniela', 'Paula', 'Lorena', 'Rosario', 'Juana', 'Teresa', 'Nora', 'Camila', 'Isabel', 'Ximena', 'Francisca', 'Claudia', 'Verónica', 'Pamela', 'Alejandra', 'Carolina', 'Angélica', 'Beatriz', 'Mónica'];
const APELLIDOS = ['Fuentes', 'Muñoz', 'Rojas', 'Contreras', 'Díaz', 'Herrera', 'Soto', 'Beltrán', 'Pizarro', 'Vidal', 'Araya', 'Ortiz', 'Castro', 'Tapia', 'Reyes', 'Lagos', 'Silva', 'Rivas', 'Núñez', 'Bravo', 'Vega', 'Morales', 'Sepúlveda', 'Espinoza', 'Valdés', 'Cortés', 'Pino', 'Navarro', 'Salinas', 'Cáceres'];
const APODERADOS = ['Carolina', 'Jorge', 'Marcela', 'Andrés', 'Patricia', 'Rodrigo', 'Francisca', 'Felipe', 'Cecilia', 'Gonzalo', 'Paz', 'Sebastián'];
const RESIDENTES = ['Inés', 'Hernán', 'Olga', 'Teresa', 'Raúl', 'Elena', 'Tomás', 'Berta', 'Arturo', 'Lidia', 'Humberto', 'Graciela', 'Ernesto', 'Amalia', 'Oscar', 'Yolanda'];
const FAMILIAS = ['Larraín', 'Pérez', 'Ibáñez', 'Morales', 'Soto', 'Vera', 'Lira', 'Echeverría', 'Guzmán', 'Aguirre', 'Prieto', 'Montes', 'Carrasco', 'Zúñiga', 'Oyarzún', 'Riquelme'];
const CUIDADOS = ['Alzheimer moderado. Se desorienta de noche.', 'Diabético, insulina 8:00 y 20:00.', 'Postrada. Cambio de posición cada 2 horas.', 'Autovalente. Apoyo en ducha y comidas.', 'Parkinson. Riesgo de caídas.', 'Dieta blanda. Paseo diario.'];

const PERFIL: Record<Area, { descripcion: string; rasgos: string[][]; valorTurno: number[]; valorHoraExtra: number }> = {
  piso: {
    descripcion: 'Técnico en enfermería. Buen trato con los residentes.',
    rasgos: [['Amable', 'Puntual', 'Cariñosa'], ['Responsable', 'Seria', 'Puntual'], ['Amable', 'Conversadora', 'Impuntual'], ['Paciente', 'Primeros auxilios'], ['Responsable', 'Tranquila']],
    valorTurno: [48000, 50000, 54000, 58000],
    valorHoraExtra: 5500,
  },
  cocina: { descripcion: 'Cocina para dietas especiales.', rasgos: [['Ordenada', 'Cocina rico'], ['Responsable', 'Cocina rico']], valorTurno: [42000], valorHoraExtra: 4500 },
  aseo: { descripcion: 'Aseo de piezas y áreas comunes.', rasgos: [['Ordenada', 'Puntual'], ['Tranquila', 'Responsable']], valorTurno: [38000], valorHoraExtra: 4000 },
  particular: { descripcion: 'Atención a domicilio de clientes particulares.', rasgos: [['Amable', 'Cariñosa'], ['Responsable', 'Paciente']], valorTurno: [52000], valorHoraExtra: 5000 },
};

// Tamaño de cada línea
const EMERGENCIAS = 7;
const CUIDADORAS_PARTICULARES = 5;
const CLIENTES_PARTICULARES = 4;
const EQUIPO_DIA = 4; // por sede, para 3 residentes
const EQUIPO_NOCHE = 3; // por sede, para 2 residentes

/** Una persona inventada; el contador asegura nombres distintos. */
function crearPersonal() {
  const lista: Cuidadora[] = [];
  const crear = (area: Area, sedeId: string | undefined, extra: Partial<Cuidadora> = {}) => {
    const i = lista.length;
    const p = PERFIL[area];
    const c: Cuidadora = {
      id: `c${i + 1}`,
      nombre: `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i + Math.floor(i / NOMBRES.length) * 11) % APELLIDOS.length]}`,
      fechaNacimiento: `${1968 + (i * 3) % 30}-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 7) % 27 + 1).padStart(2, '0')}`,
      experiencia: 2 + (i * 5) % 19,
      telefono: `+56 9 5555 ${String(1000 + i)}`,
      descripcion: p.descripcion,
      rasgos: p.rasgos[i % p.rasgos.length],
      valoracion: 3 + (i % 3),
      valorTurno: p.valorTurno[i % p.valorTurno.length],
      valorHoraExtra: p.valorHoraExtra,
      area,
      sedeId,
      color: COLORES[i % COLORES.length],
      activa: true,
      notas: '',
      ...extra,
    };
    lista.push(c);
    return c.id;
  };
  return { lista, crear };
}

export function crearSeed(): DB {
  const h = hoy();
  const lunes = lunesDe(h);
  const horaActual = new Date().getHours();
  const asignaciones: Asignacion[] = [];
  const dia = TURNOS_BASE[0];
  const noche = TURNOS_BASE[1];
  const { lista: cuidadoras, crear } = crearPersonal();
  const pisos: Piso[] = [];
  const clientes: Cliente[] = [];
  const personas: Persona[] = [];

  const crearResidente = (sedeId: string, pisoId: string | undefined, conNoche: boolean, cobroSemanal: number) => {
    const i = personas.length;
    const familia = FAMILIAS[i % FAMILIAS.length];
    const clienteId = `k${i + 1}`;
    clientes.push({ id: clienteId, sedeId, nombre: `${APODERADOS[i % APODERADOS.length]} ${familia}`, telefono: `+56 9 5555 ${String(2000 + i)}`, cobroSemanal, activo: true });
    const personaId = `r${i + 1}`;
    personas.push({
      id: personaId, clienteId, nombre: `${RESIDENTES[i % RESIDENTES.length]} ${familia}`, pisoId,
      fechaNacimiento: `${1934 + (i * 3) % 14}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      cuidados: CUIDADOS[i % CUIDADOS.length], requeridas: { dia: 1, noche: conNoche ? 1 : 0 }, activa: true,
    });
    return personaId;
  };

  // Equipos: quién rota en qué puestos. Cada sede tiene 3 residentes, 2 de ellos con turno de noche.
  const equipos: { turno: Turno; sedeIdx: number; personal: string[]; puestos: string[] }[] = [];
  const otrasAreas: { cid: string; sedeId: string }[] = [];
  const sedes = SEDES_ACALI.filter((s) => s.id !== SEDE_PARTICULARES);
  sedes.forEach((s, sedeIdx) => {
    const p1 = { id: `${s.id}-1`, nombre: 'Piso 1', sedeId: s.id };
    const p2 = { id: `${s.id}-2`, nombre: 'Piso 2', sedeId: s.id };
    pisos.push(p1, p2);
    const r1 = crearResidente(s.id, p1.id, true, 1180000);
    const r2 = crearResidente(s.id, p1.id, false, 700000);
    const r3 = crearResidente(s.id, p2.id, true, 1120000);
    const deDia = Array.from({ length: EQUIPO_DIA }, () => crear('piso', s.id));
    const deNoche = Array.from({ length: EQUIPO_NOCHE }, () => crear('piso', s.id));
    equipos.push({ turno: dia, sedeIdx, personal: deDia, puestos: [r1, r2, r3] });
    equipos.push({ turno: noche, sedeIdx, personal: deNoche, puestos: [r1, r3] });
    otrasAreas.push({ cid: crear('cocina', s.id), sedeId: s.id }, { cid: crear('aseo', s.id), sedeId: s.id });
  });

  // Particulares: clientes con sus cuidadoras, sin pisos
  const puestosParticulares = Array.from({ length: CLIENTES_PARTICULARES }, () => crearResidente(SEDE_PARTICULARES, undefined, false, 500000));
  const deParticulares = Array.from({ length: CUIDADORAS_PARTICULARES }, () => crear('particular', SEDE_PARTICULARES));
  equipos.push({ turno: dia, sedeIdx: -1, personal: deParticulares, puestos: puestosParticulares });

  // Emergencia: sin sede fija, cubren faltas y refuerzos en cualquier sede
  const emergencias = Array.from({ length: EMERGENCIAS }, () =>
    crear('piso', undefined, { emergencia: true, valorTurno: 65000, valorHoraExtra: 7000, descripcion: 'Personal de emergencia: cubre cualquier sede con poco aviso.', rasgos: ['Responsable', 'Primeros auxilios'] }),
  );

  const estadoDe = (fecha: string, esDia: boolean): Asignacion['estado'] => {
    if (fecha < h) return 'asistio';
    return fecha === h && esDia && horaActual >= 9 ? 'asistio' : 'programado';
  };

  for (const semana of [-5, -4, -3, -2, -1, 0, 1]) {
    for (let d = 0; d < 7; d++) {
      const n = (semana + 10) * 7 + d; // contador estable para rotar
      const fecha = sumarDias(lunes, semana * 7 + d);
      let reemplazos = 0;

      for (const { turno: t, sedeIdx, personal, puestos } of equipos) {
        puestos.forEach((personaId, i) => {
          // Cupos sin cubrir, siempre cerca de hoy, para que se vea la alerta
          if ((fecha === sumarDias(h, 3) && sedeIdx === 0 && i === 2 && t.id === 'dia') || (fecha === sumarDias(h, 5) && sedeIdx === 3 && i === 1 && t.id === 'noche')) return;
          const cid = personal[(n + i) % personal.length];
          const c = cuidadoras.find((x) => x.id === cid)!;
          let estado = estadoDe(fecha, t.id === 'dia');
          const pasado = fecha < h;
          if (pasado && c.rasgos.includes('Impuntual') && (n + i) % 3 === 0) estado = 'atraso';
          // De vez en cuando alguien falta y entra una persona de Emergencia a reemplazarla
          const falta = pasado && (n + i + (sedeIdx + 1) * 5) % 41 === 0;
          if (falta) estado = 'falto';
          const horasExtra = pasado && !falta && (n + i + sedeIdx) % 17 === 0 ? 2 : undefined;
          asignaciones.push({ id: uid(), fecha, turnoId: t.id, personaId, cuidadoraId: cid, ...horario(t, fecha), estado, horasExtra });
          if (falta) {
            asignaciones.push({
              id: uid(), fecha, turnoId: t.id, personaId, cuidadoraId: emergencias[(n + reemplazos) % emergencias.length], ...horario(t, fecha),
              estado: 'asistio', nota: `Reemplazo de ${c.nombre}`,
            });
            reemplazos++;
          }
        });
      }

      // Cocina y Aseo: de día, de lunes a sábado
      if (d < 6) {
        for (const { cid, sedeId } of otrasAreas) {
          asignaciones.push({ id: uid(), fecha, turnoId: 'dia', sedeId, cuidadoraId: cid, ...horario(dia, fecha), estado: estadoDe(fecha, true) });
        }
      }

      // Un refuerzo de emergencia al día, rotando por las sedes
      const eq = equipos.filter((x) => x.turno.id === 'dia' && x.sedeIdx >= 0)[n % sedes.length];
      asignaciones.push({
        id: uid(), fecha, turnoId: 'dia', personaId: eq.puestos[0], cuidadoraId: emergencias[(n + reemplazos) % emergencias.length], ...horario(dia, fecha),
        estado: estadoDe(fecha, true), nota: 'Refuerzo de emergencia',
      });
    }
  }

  const movimientos: Movimiento[] = [];
  for (const semana of [-5, -4, -3, -2, -1, 0]) {
    const lun = sumarDias(lunes, semana * 7);
    const add = (d: number, m: Omit<Movimiento, 'id' | 'fecha'>) => {
      const fecha = sumarDias(lun, d);
      if (fecha <= h) movimientos.push({ id: uid(), fecha, ...m });
    };
    clientes.forEach((k, i) => add(i % 5, { sedeId: k.sedeId, tipo: 'ingreso', concepto: 'Servicio de cuidado semanal', cliente: k.nombre, monto: k.cobroSemanal, medio: 'transferencia' }));
    sedes.forEach((s, i) => {
      if ((semana + i) % 2 === 0) add(3, { sedeId: s.id, tipo: 'gasto', concepto: 'Insumos (guantes, pañales, alcohol gel)', monto: 58000, medio: 'efectivo' });
      add(4, { sedeId: s.id, tipo: 'gasto', concepto: 'Movilización del personal', monto: 42000, medio: 'efectivo' });
    });
  }

  const db: DB = { cuidadoras, turnos: TURNOS_BASE, sedes: SEDES_ACALI, pisos, clientes, personas, asignaciones, pagos: [], movimientos, ajustes: { nombreDuena: 'Leris' } };

  // Quincenas ya terminadas: pagadas; emergencia: pagada cada día
  for (let d = quincenaDe(sumarDias(lunes, -35)).desde; quincenaDe(d).hasta < h; d = moverQuincena(d, 1)) {
    const q = quincenaDe(d);
    for (const c of cuidadoras.filter((x) => !x.emergencia)) {
      const r = resumenPeriodo(db, c.id, q.desde, q.hasta, q.clave);
      if (r.turnos) db.pagos.push({ id: uid(), cuidadoraId: c.id, periodo: q.clave, ajuste: 0, monto: r.subtotal, pagadoEl: q.hasta });
    }
  }
  for (const c of emergencias) {
    const fechas = new Set(asignaciones.filter((a) => a.cuidadoraId === c && a.fecha < h).map((a) => a.fecha));
    for (const f of fechas) {
      const clave = `d:${f}`;
      db.pagos.push({ id: uid(), cuidadoraId: c, periodo: clave, ajuste: 0, monto: resumenPeriodo(db, c, f, f, clave).subtotal, pagadoEl: f });
    }
  }
  return db;
}

export const dbVacia = (): DB => ({
  cuidadoras: [], turnos: TURNOS_BASE, sedes: SEDES_ACALI, pisos: [], clientes: [], personas: [], asignaciones: [], pagos: [], movimientos: [], ajustes: { nombreDuena: 'Leris' },
});
