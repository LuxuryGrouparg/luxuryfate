import { arNow, isSunday } from './dates.ts';
import { store } from './server/store.ts';

export type Slot = { time: string; available: boolean };

// Turnos cada 45 min, con pausa al mediodía (igual que el diseño).
export const SLOTS = ['10:00', '10:45', '11:30', '12:15', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45', '18:30', '19:15'];

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Turnos que ocupa un servicio de `durationMin` que empieza a las `time`. */
export const coveredSlots = (time: string, durationMin: number) =>
  SLOTS.filter((s) => toMin(s) >= toMin(time) && toMin(s) < toMin(time) + durationMin);

export const lockKeys = (date: string, time: string, durationMin: number) =>
  coveredSlots(time, durationMin).map((s) => `lock:${date}:${s}`);

/**
 * Horarios de un día para un servicio de `durationMin` minutos.
 * Descuenta las reservas guardadas (pendientes de pago o confirmadas).
 * shortcut: los "ocupados" de base son un mock pseudoaleatorio estable por fecha;
 * reemplazar `mockBusy` por la consulta a Google Calendar o Cal.com cuando se conecte la agenda real.
 */
export async function getAvailability(date: string, durationMin: number): Promise<Slot[]> {
  if (isSunday(date)) return [];

  let seed = [...date].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;
  const mockBusy = new Set(SLOTS.filter(() => rand() <= 0.25));

  const now = arNow();
  const db = store();
  return Promise.all(
    SLOTS.map(async (time) => {
      const covered = coveredSlots(time, durationMin);
      const past = date < now.date || (date === now.date && time <= now.time);
      const busy = covered.some((s) => mockBusy.has(s)) || (await db.anyLocked(lockKeys(date, time, durationMin)));
      return { time, available: !past && !busy };
    }),
  );
}
