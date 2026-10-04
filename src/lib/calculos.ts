import type { Asignacion, DB, Turno } from './types';
import { aMin, duracion, hoy, sumarDias } from './fechas';

export const horasDe = (a: Pick<Asignacion, 'inicio' | 'fin'>) => duracion(a.inicio, a.fin);

export const asignacionesSemana = (db: DB, lunes: string) => {
  const fin = sumarDias(lunes, 6);
  return db.asignaciones.filter((a) => a.fecha >= lunes && a.fecha <= fin);
};

/** Turno al que pertenece una hora de inicio (sirve para "asignar horas" libres). */
export function turnoSugerido(turnos: Turno[], inicio: string): Turno | undefined {
  const s = aMin(inicio);
  return turnos.find((t) => {
    const a = aMin(t.inicio);
    const b = aMin(t.fin);
    return a < b ? s >= a && s < b : s >= a || s < b;
  });
}

/** Resumen de horas y pago de una cuidadora en una semana (lunes a domingo). */
export function resumenSemana(db: DB, cuidadoraId: string, lunes: string) {
  const c = db.cuidadoras.find((x) => x.id === cuidadoraId);
  const h = hoy();
  const lista = asignacionesSemana(db, lunes).filter((a) => a.cuidadoraId === cuidadoraId);
  let hechas = 0, porVenir = 0, sinConfirmar = 0, faltas = 0, atrasos = 0;
  for (const a of lista) {
    if (a.estado === 'falto') { faltas++; continue; }
    if (a.estado === 'atraso') atrasos++;
    const hrs = horasDe(a);
    if (a.fecha > h) porVenir += hrs;
    else {
      hechas += hrs;
      if (a.estado === 'programado') sinConfirmar++;
    }
  }
  const pago = db.pagos.find((p) => p.cuidadoraId === cuidadoraId && p.semana === lunes);
  const tarifa = c?.tarifaHora ?? 0;
  const subtotal = Math.round((hechas + porVenir) * tarifa);
  const ajuste = pago?.ajuste ?? 0;
  return {
    turnos: lista.length, hechas, porVenir, horas: hechas + porVenir, sinConfirmar, faltas, atrasos,
    tarifa, subtotal, ajuste, total: subtotal + ajuste, pago, pagado: !!pago?.pagadoEl,
  };
}

/** Indicadores históricos de una cuidadora. */
export function estadisticas(db: DB, cuidadoraId: string) {
  const h = hoy();
  const mias = db.asignaciones.filter((a) => a.cuidadoraId === cuidadoraId);
  const pasadas = mias.filter((a) => a.fecha <= h && a.estado !== 'programado');
  const asistio = pasadas.filter((a) => a.estado === 'asistio').length;
  const atraso = pasadas.filter((a) => a.estado === 'atraso').length;
  const falto = pasadas.filter((a) => a.estado === 'falto').length;
  const desde = sumarDias(h, -27);
  const horas4 = mias
    .filter((a) => a.fecha >= desde && a.fecha <= h && a.estado !== 'falto')
    .reduce((s, a) => s + horasDe(a), 0);
  const pagado = db.pagos.filter((p) => p.cuidadoraId === cuidadoraId && p.pagadoEl).reduce((s, p) => s + p.monto, 0);
  return {
    asistencia: pasadas.length ? (asistio + atraso) / pasadas.length : null,
    puntualidad: asistio + atraso ? asistio / (asistio + atraso) : null,
    asistio, atraso, falto, horas4, pagado,
    proximos: mias
      .filter((a) => a.fecha > h || (a.fecha === h && a.estado === 'programado'))
      .sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio))
      .slice(0, 4),
    ultimos: [...pasadas].sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio)).slice(0, 6),
  };
}

/** Turnos sin nadie (o donde la cuidadora faltó) a partir de una fecha. */
export function huecos(db: DB, desde: string, dias: number) {
  const out: { fecha: string; turno: Turno }[] = [];
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(desde, i);
    for (const t of db.turnos) {
      const cubierto = db.asignaciones.some((a) => a.fecha === fecha && a.turnoId === t.id && a.estado !== 'falto');
      if (!cubierto) out.push({ fecha, turno: t });
    }
  }
  return out;
}

/** Descarga un CSV que Excel abre bien en español (separador ; y BOM). */
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const txt = filas
    .map((f) =>
      f.map((v) => {
        const s = String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';'),
    )
    .join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const linkWhatsApp = (telefono: string, texto: string) =>
  `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
