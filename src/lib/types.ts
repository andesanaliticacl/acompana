import type { ColorKey } from './colores';

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
  emoji: string;
  inicio: string; // HH:MM
  fin: string; // HH:MM (si es menor que inicio, cruza la medianoche)
  color: ColorKey;
}

export interface Asignacion {
  id: string;
  fecha: string; // día en que empieza el turno
  turnoId: string;
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

export interface DB {
  cuidadoras: Cuidadora[];
  turnos: Turno[];
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
  programado: { label: 'Programado', corto: 'Por venir', bg: '#f3eef4', fg: '#7b6e80' },
  asistio: { label: 'Asistió', corto: 'Llegó', bg: '#dcf3e9', fg: '#22724f' },
  atraso: { label: 'Llegó tarde', corto: 'Tarde', bg: '#fbf3c9', fg: '#7a6410' },
  falto: { label: 'Faltó', corto: 'No vino', bg: '#fde2ea', fg: '#a8355d' },
};
