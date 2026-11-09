/** Fecha local en formato AAAA-MM-DD (sin pasar por UTC). */
export function isoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Interpreta AAAA-MM-DD como fecha local. */
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Primer día del mes, AAAA-MM-01. */
export function monthKey(d: Date = new Date()): string {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function shiftMonth(key: string, n: number): string {
  const d = parseIso(key);
  return monthKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}
