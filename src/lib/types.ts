import type { ColorKey } from './colores';

export type IconoTurno = 'manana' | 'tarde' | 'noche' | 'reloj';

export type Estado = 'programado' | 'asistio' | 'atraso' | 'falto';

export interface Cuidadora {
  id: string;
  nombre: string;
  fechaNacimiento: string; // YYYY-MM-DD
  experiencia: number; // años
  telefono: string;
  descripcion: string;
  rasgos: string[];
  valoracion: number; // 1..5, la pone la dueña
  tarifaHora: number; // CLP
  color: ColorKey;
  activa: boolean;
  notas: string; // notas privadas de la dueña
}

export interface Turno {
  id: string;
  nombre: string;
  icono: IconoTurno;
  inicio: string; // HH:MM
  fin: string; // HH:MM (si es menor que inicio, cruza la medianoche)
  color: ColorKey;
  requeridas: number; // cuántas cuidadoras necesita el turno
  /** Horario distinto un día de la semana (0 = lunes … 6 = domingo), ej. domingo parte a las 9. */
  excepcion?: { dia: number; inicio: string; fin: string } | null;
}

export interface Asignacion {
  id: string;
  fecha: string; // día en que empieza el turno
  turnoId: string;
  personaId?: string; // a quién cuida en ese turno (el piso sale de la persona)
  pisoId?: string; // solo si no tiene persona
  cuidadoraId: string;
  inicio: string;
  fin: string;
  estado: Estado;
  nota?: string;
}

/** Un pago por cuidadora y semana (semana = lunes ISO). Se paga el domingo. */
export interface Pago {
  id: string;
  cuidadoraId: string;
  semana: string;
  ajuste: number; // bono (+) o descuento (-)
  monto: number; // monto final pagado
  pagadoEl: string | null;
}

export interface Movimiento {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  monto: number;
  cliente?: string;
  medio: 'efectivo' | 'transferencia';
}

/** Piso o sector de la residencia. */
export interface Piso {
  id: string;
  nombre: string;
}

export interface DB {
  cuidadoras: Cuidadora[];
  turnos: Turno[];
  pisos: Piso[];
  clientes: Cliente[];
  personas: Persona[];
  asignaciones: Asignacion[];
  pagos: Pago[];
  movimientos: Movimiento[];
  ajustes: { nombreDuena: string };
}

export const RASGOS: { nombre: string; tono: 'bueno' | 'neutro' | 'ojo' }[] = [
  { nombre: 'Amable', tono: 'bueno' },
  { nombre: 'Puntual', tono: 'bueno' },
  { nombre: 'Responsable', tono: 'bueno' },
  { nombre: 'Cariñosa', tono: 'bueno' },
  { nombre: 'Paciente', tono: 'bueno' },
  { nombre: 'Ordenada', tono: 'bueno' },
  { nombre: 'Cocina rico', tono: 'bueno' },
  { nombre: 'Primeros auxilios', tono: 'bueno' },
  { nombre: 'Seria', tono: 'neutro' },
  { nombre: 'Conversadora', tono: 'neutro' },
  { nombre: 'Tranquila', tono: 'neutro' },
  { nombre: 'Impuntual', tono: 'ojo' },
  { nombre: 'Olvidadiza', tono: 'ojo' },
  { nombre: 'Mucho celular', tono: 'ojo' },
];

export const tonoRasgo = (r: string) => RASGOS.find((x) => x.nombre === r)?.tono ?? 'neutro';

export const ESTADOS: Record<Estado, { label: string; corto: string; bg: string; fg: string }> = {
  programado: { label: 'Programado', corto: 'Pendiente', bg: 'var(--c-hover)', fg: 'var(--c-tinta-2)' },
  asistio: { label: 'Asistió', corto: 'Llegó', bg: 'var(--c-ok-50)', fg: 'var(--c-ok)' },
  atraso: { label: 'Llegó tarde', corto: 'Tarde', bg: 'var(--c-aviso-50)', fg: 'var(--c-aviso)' },
  falto: { label: 'Faltó', corto: 'No vino', bg: 'var(--c-alerta-50)', fg: 'var(--c-alerta)' },
};

/** Cliente = apoderado que contrata y paga el servicio. */
export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  cobroSemanal: number; // CLP
  activo: boolean;
}

/** Residente (adulto mayor) a cargo de un cliente. `requeridas[turnoId]` = cuidadoras que necesita en ese turno. */
export interface Persona {
  id: string;
  clienteId?: string;
  nombre: string;
  pisoId?: string;
  fechaNacimiento?: string;
  cuidados: string; // diagnóstico, movilidad, dieta, medicamentos…
  requeridas: Record<string, number>;
  activa: boolean;
}
