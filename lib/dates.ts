// Fechas como 'YYYY-MM-DD' en hora de Argentina (UTC-3, sin horario de verano).

export const TZ = 'America/Argentina/Buenos_Aires';

const atNoonUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** Fecha y hora actuales en Argentina: { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
export function arNow(now = new Date()) {
  const date = now.toLocaleDateString('en-CA', { timeZone: TZ });
  const time = now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export function addDays(iso: string, n: number) {
  const d = atNoonUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isSunday = (iso: string) => atNoonUTC(iso).getUTCDay() === 0;

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  atNoonUTC(iso).toLocaleDateString('es-AR', { ...opts, timeZone: 'UTC' }).replace('.', '');

/** 'mié', 'jue'… */
export const dowShort = (iso: string) => fmt(iso, { weekday: 'short' });
export const dayNum = (iso: string) => atNoonUTC(iso).getUTCDate();

/** 'Viernes 27 de noviembre' */
export function longLabel(iso: string) {
  const s = `${fmt(iso, { weekday: 'long' })} ${dayNum(iso)} de ${fmt(iso, { month: 'long' })}`;
  return s[0].toUpperCase() + s.slice(1);
}
