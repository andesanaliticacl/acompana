const pad = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const hoy = () => iso(new Date());
export const sumarDias = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** Lunes de la semana de la fecha dada. */
export const lunesDe = (s: string) => {
  const d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
};
export const diasSemana = (lunes: string) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
export const diasEntre = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtDia = (s: string) =>
  cap(parse(s).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));
export const fmtLargo = (s: string) =>
  cap(parse(s).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }));
export const fmtCorto = (s: string) =>
  parse(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace(/\./g, '');
export const fmtMes = (s: string) => cap(parse(s).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }));

export const edad = (nac: string) => {
  const n = parse(nac);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
};

export const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
/** Duración en horas; si fin <= inicio el turno cruza la medianoche. */
export const duracion = (inicio: string, fin: string) => {
  let m = aMin(fin) - aMin(inicio);
  if (m <= 0) m += 24 * 60;
  return m / 60;
};
export const fmtHora = (hhmm: string) => hhmm.replace(/^0(\d)/, '$1').replace(':00', '');

export const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
export const fmtHoras = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
