import type { Asignacion, DB, Persona, Turno } from './types';
import { aMin, duracion, hoy, parse, quincenaDe, sumarDias } from './fechas';

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

/** Resumen de una persona en un período: se paga por turno, más las horas extra rellenadas. Las faltas no se pagan. */
export function resumenPeriodo(db: DB, cuidadoraId: string, desde: string, hasta: string, clave?: string) {
  const c = db.cuidadoras.find((x) => x.id === cuidadoraId);
  const h = hoy();
  const lista = db.asignaciones.filter((a) => a.cuidadoraId === cuidadoraId && a.fecha >= desde && a.fecha <= hasta);
  let pagables = 0, porVenir = 0, sinConfirmar = 0, faltas = 0, atrasos = 0, horasExtra = 0;
  for (const a of lista) {
    if (a.estado === 'falto') { faltas++; continue; }
    if (a.estado === 'atraso') atrasos++;
    pagables++;
    horasExtra += a.horasExtra ?? 0;
    if (a.fecha > h) porVenir++;
    else if (a.estado === 'programado') sinConfirmar++;
  }
  const pago = clave ? db.pagos.find((p) => p.cuidadoraId === cuidadoraId && p.periodo === clave) : undefined;
  const valor = c?.valorTurno ?? 0;
  const valorExtra = c?.valorHoraExtra ?? 0;
  const subtotal = pagables * valor + Math.round(horasExtra * valorExtra);
  const ajuste = pago?.ajuste ?? 0;
  return {
    turnos: lista.length, pagables, porVenir, sinConfirmar, faltas, atrasos, horasExtra,
    valor, valorExtra, subtotal, ajuste, total: subtotal + ajuste, pago, pagado: !!pago?.pagadoEl,
  };
}

/** Turnos de una persona en una semana (para la planilla del calendario). */
export const resumenSemana = (db: DB, cuidadoraId: string, lunes: string) => resumenPeriodo(db, cuidadoraId, lunes, sumarDias(lunes, 6));

/** Lo que falta pagar en la quincena de una fecha: quincena para el personal normal, día a día para emergencia. */
export function porPagarQuincena(db: DB, cuidadoras: DB['cuidadoras'], fecha: string) {
  const q = quincenaDe(fecha);
  let total = 0;
  for (const c of cuidadoras) {
    if (c.emergencia) {
      for (let d = q.desde; d <= q.hasta; d = sumarDias(d, 1)) {
        const r = resumenPeriodo(db, c.id, d, d, `d:${d}`);
        if (!r.pagado) total += r.total;
      }
    } else {
      const r = resumenPeriodo(db, c.id, q.desde, q.hasta, q.clave);
      if (!r.pagado) total += r.total;
    }
  }
  return total;
}

/* ───────────── Sedes ───────────── */

/** Sede elegida en el selector (si la guardada ya no existe, la primera). */
export const sedeActiva = (db: DB) =>
  db.sedes.some((s) => s.id === db.ajustes.sedeId) ? db.ajustes.sedeId : db.sedes[0]?.id;
export const nombreSede = (db: DB, id?: string) => db.sedes.find((s) => s.id === id)?.nombre;

/** Sede de un residente: la de su cliente o, si no tiene, la de su piso. */
export const sedeDePersona = (db: DB, p: Persona) =>
  db.clientes.find((c) => c.id === p.clienteId)?.sedeId ?? db.pisos.find((x) => x.id === p.pisoId)?.sedeId;
/** Sede de una asignación: la del residente o, si no tiene (cocina, aseo), la guardada en ella. */
export const sedeDeAsignacion = (db: DB, a: Asignacion) => {
  const p = a.personaId ? db.personas.find((x) => x.id === a.personaId) : undefined;
  return (p && sedeDePersona(db, p)) ?? a.sedeId;
};
/** Lo que no tiene sede se ve en todas. */
export const enSede = (sedeId: string | undefined, actual: string | undefined) => !actual || !sedeId || sedeId === actual;

/** La misma base, pero solo con lo de la sede elegida. El personal se mantiene completo (hay reemplazos entre sedes). */
export function vistaSede(db: DB): DB {
  const actual = sedeActiva(db);
  if (!actual) return db;
  return {
    ...db,
    pisos: db.pisos.filter((x) => enSede(x.sedeId, actual)),
    clientes: db.clientes.filter((x) => enSede(x.sedeId, actual)),
    personas: db.personas.filter((x) => enSede(sedeDePersona(db, x), actual)),
    asignaciones: db.asignaciones.filter((x) => enSede(sedeDeAsignacion(db, x), actual)),
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

/** Día de la semana con lunes = 0 … domingo = 6. */
export const diaSemana = (fecha: string) => (parse(fecha).getDay() + 6) % 7;

/** Horario real de un turno en una fecha (aplica la excepción, ej. domingo desde las 9). */
export function horario(t: Turno, fecha: string) {
  const ex = t.excepcion;
  return ex && ex.dia === diaSemana(fecha) ? { inicio: ex.inicio, fin: ex.fin } : { inicio: t.inicio, fin: t.fin };
}

/** Residente de una asignación, su cliente (apoderado) y el piso donde se trabaja. */
export const personaDe = (db: DB, a: Pick<Asignacion, 'personaId'>) =>
  a.personaId ? db.personas.find((p) => p.id === a.personaId) : undefined;
export const clienteDe = (db: DB, a: Pick<Asignacion, 'personaId'>) => {
  const p = personaDe(db, a);
  return p?.clienteId ? db.clientes.find((c) => c.id === p.clienteId) : undefined;
};
export const pisoDe = (db: DB, a: Pick<Asignacion, 'personaId' | 'pisoId'>) => personaDe(db, a)?.pisoId ?? a.pisoId;

export const personasActivas = (db: DB) => {
  const orden = (id?: string) => { const i = db.pisos.findIndex((p) => p.id === id); return i < 0 ? 99 : i; };
  return db.personas.filter((c) => c.activa).sort((a, b) => orden(a.pisoId) - orden(b.pisoId) || a.nombre.localeCompare(b.nombre));
};

/** Cuidadoras que necesita una persona en un turno. */
export const requeridasPersona = (p: Persona, turnoId: string) => (p.activa ? p.requeridas[turnoId] ?? 0 : 0);

/** Cuidadoras que necesita un turno en total: la suma de lo que necesita cada residente (0 si no hay residentes). */
export const requeridasTurno = (db: DB, t: Turno) => {
  const cs = personasActivas(db);
  return cs.reduce((s, c) => s + requeridasPersona(c, t.id), 0);
};

/** Cuántas cuidadoras cubren un turno en una fecha, opcionalmente para una persona o piso. Las que faltaron no cuentan. */
export const cubiertas = (db: DB, fecha: string, turnoId: string, filtro: { personaId?: string; pisoId?: string } = {}) =>
  db.asignaciones.filter(
    (a) =>
      a.fecha === fecha && a.turnoId === turnoId && a.estado !== 'falto' &&
      (!filtro.personaId || a.personaId === filtro.personaId) &&
      (!filtro.pisoId || pisoDe(db, a) === filtro.pisoId),
  ).length;

/** Turnos a los que les falta gente a partir de una fecha (con personas, se mira persona por persona). */
export function huecos(db: DB, desde: string, dias: number) {
  const out: { fecha: string; turno: Turno; hay: number; req: number; faltan: number; donde: string[] }[] = [];
  const cs = personasActivas(db);
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(desde, i);
    for (const t of db.turnos) {
      const hay = cubiertas(db, fecha, t.id);
      const req = requeridasTurno(db, t);
      let faltan = 0;
      const donde: string[] = [];
      if (cs.length) {
        for (const c of cs) {
          const f = Math.max(0, requeridasPersona(c, t.id) - cubiertas(db, fecha, t.id, { personaId: c.id }));
          if (f) { faltan += f; donde.push(c.nombre); }
        }
      } else faltan = Math.max(0, req - hay);
      if (faltan > 0) out.push({ fecha, turno: t, hay, req, faltan, donde });
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
