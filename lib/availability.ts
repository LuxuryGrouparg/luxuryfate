import { site } from '../config/site.ts';
import { arNow, isSunday } from './dates.ts';
import { store } from './server/store.ts';

export type Slot = { time: string; available: boolean };

const hour = (t: string) => Number(t.slice(0, 2));

// Turnos de 1 hora desde la apertura hasta una hora antes del cierre (config/site.ts → hours).
export const SLOTS = Array.from(
  { length: hour(site.hours.closes) - hour(site.hours.opens) },
  (_, i) => `${String(hour(site.hours.opens) + i).padStart(2, '0')}:00`,
);

/** Cada reserva bloquea su hora completa. */
export const lockKey = (date: string, time: string) => `lock:${date}:${time}`;

/**
 * Horarios de un día. Descuenta las reservas guardadas.
 * shortcut: los "ocupados" de base son un mock pseudoaleatorio estable por fecha;
 * reemplazar `mockBusy` por la consulta a Google Calendar o Cal.com cuando se conecte la agenda real.
 */
export async function getAvailability(date: string): Promise<Slot[]> {
  if (isSunday(date)) return [];

  let seed = [...date].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;
  const mockBusy = new Set(SLOTS.filter(() => rand() <= 0.25));

  const now = arNow();
  const db = store();
  return Promise.all(
    SLOTS.map(async (time) => {
      const past = date < now.date || (date === now.date && time <= now.time);
      const busy = mockBusy.has(time) || (await db.anyLocked([lockKey(date, time)]));
      return { time, available: !past && !busy };
    }),
  );
}
