import { randomUUID } from 'node:crypto';
import { site } from '@/config/site';
import { getAvailability, lockKey, SLOTS } from '@/lib/availability';
import { normalizeWhatsapp, priceFor, validateBooking, type BookingForm, type City, type ClientType } from '@/lib/booking';
import { addDays, arNow, isSunday } from '@/lib/dates';
import { store } from './store';

export type BookingStatus = 'pending_whatsapp' | 'cancelled';

export type Booking = {
  id: string;
  status: BookingStatus;
  created_at: string;
  client_type: ClientType;
  service: { id: string; name: string; price: number; promo: 'martes_studio' | null };
  date: string;
  time: string;
  datetime: string;
  customer: { first_name: string; last_name: string; whatsapp: string };
  location: { city: City; address: string };
  note: string;
};

export const DURATION_MIN = 60;

const key = (id: string) => `booking:${id}`;
export const getBooking = (id: string) => store().get<Booking>(key(id));
const save = (b: Booking) => store().set(key(b.id), b);

type Result = { ok: true; booking: Booking } | { ok: false; status: number; error: string };
const bad = (error: string): Result => ({ ok: false, status: 400, error });
const taken: Result = { ok: false, status: 409, error: 'Ese horario se acaba de ocupar. Elegí otro, por favor.' };

export async function createBooking(input: Record<string, unknown>): Promise<Result> {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const clientType = str('client_type');
  const date = str('date');
  const time = str('time');
  const service = site.services.find((s) => s.id === str('service_id'));
  const form: BookingForm = {
    firstName: str('first_name'),
    lastName: str('last_name'),
    whatsapp: str('whatsapp'),
    city: str('city') as City,
    address: str('address'),
    note: str('note'),
  };

  const today = arNow().date;
  if (clientType !== 'nuevo' && clientType !== 'habitual') return bad('Tipo de cliente inválido.');
  if (!service) return bad('Servicio inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, 6) || isSunday(date)) return bad('Fecha inválida.');
  if (!SLOTS.includes(time)) return bad('Horario inválido.');
  const errors = validateBooking(form);
  if (Object.keys(errors).length) return bad(Object.values(errors)[0]!);
  for (const [k, v] of Object.entries(form)) if (k !== 'note' && v.length > 200) return bad('Datos demasiado largos.');

  const slot = (await getAvailability(date)).find((s) => s.time === time);
  if (!slot?.available) return taken;

  const id = randomUUID();
  // El horario queda tomado hasta que lo liberes con PATCH /api/bookings/:id si la persona no confirma.
  if (!(await store().lockAll([lockKey(date, time)], id, null))) return taken;

  const { price, promo } = priceFor(service.id, date); // el precio siempre lo calcula el servidor
  const booking: Booking = {
    id,
    status: 'pending_whatsapp',
    created_at: new Date().toISOString(),
    client_type: clientType,
    service: { id: service.id, name: service.name, price, promo },
    date,
    time,
    datetime: `${date}T${time}:00-03:00`,
    customer: {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      whatsapp: normalizeWhatsapp(form.whatsapp)!,
    },
    location: { city: form.city, address: form.address.trim() },
    note: form.note.trim(),
  };
  await save(booking);
  await notify(booking).catch((e) => console.error('[bookings] el webhook de automatización falló', id, e));
  return { ok: true, booking };
}

/** Cancela una reserva y libera su horario. */
export async function cancelBooking(b: Booking): Promise<Booking> {
  if (b.status !== 'cancelled') {
    b.status = 'cancelled';
    await save(b);
    await store().unlockAll([lockKey(b.date, b.time)], b.id);
  }
  return b;
}

/** Envía la reserva al webhook de automatización (n8n / Make). */
async function notify(b: Booking) {
  const url = process.env.AUTOMATION_WEBHOOK_URL;
  if (!url) return console.warn(`[bookings] AUTOMATION_WEBHOOK_URL no configurada; no se envió ${b.id}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'booking.requested',
      booking_id: b.id,
      brand: site.name,
      client_type: b.client_type,
      service: { name: b.service.name, price: b.service.price, promo: b.service.promo },
      datetime: b.datetime,
      duration_min: DURATION_MIN,
      customer: { ...b.customer, email: null },
      location: b.location,
      note: b.note,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Webhook de automatización respondió ${res.status}`);
}

/** Lo que el navegador puede ver de una reserva. */
export const publicView = (b: Booking) => ({
  id: b.id,
  status: b.status,
  service: b.service.name,
  price: b.service.price,
  promo: b.service.promo,
  date: b.date,
  time: b.time,
});
