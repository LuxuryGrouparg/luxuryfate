import { randomUUID } from 'node:crypto';
import { site } from '@/config/site';
import { getAvailability, lockKeys, SLOTS } from '@/lib/availability';
import { normalizeWhatsapp, validateBooking, type BookingForm, type City } from '@/lib/booking';
import { addDays, arNow, isSunday } from '@/lib/dates';
import { createCheckout, searchPayments, type MpPayment } from './mp';
import { store } from './store';

export type PayMethod = 'mp_deposit' | 'mp_full' | 'transfer';
export type BookingStatus = 'pending_payment' | 'pending_transfer' | 'confirmed' | 'payment_failed' | 'cancelled' | 'needs_review';

export type Booking = {
  id: string;
  status: BookingStatus;
  created_at: string;
  client_type: 'primera_vez' | 'habitual';
  service: { id: string; name: string; duration_min: number; price: number };
  date: string;
  time: string;
  datetime: string;
  payment: { method: PayMethod; amount_due_now: number; amount_paid: number; balance_due: number; mp_payment_id: string };
  customer: { first_name: string; last_name: string; whatsapp: string; email: string };
  location: { city: City; address: string };
  /** Último evento enviado con éxito al webhook de automatización. */
  notified?: string;
};

/** Minutos que se reserva el horario mientras la persona paga en Mercado Pago. */
export const HOLD_MINUTES = 15;

const key = (id: string) => `booking:${id}`;
export const getBooking = (id: string) => store().get<Booking>(key(id));
const save = (b: Booking) => store().set(key(b.id), b);

type Result = { ok: true; booking: Booking; checkoutUrl?: string } | { ok: false; status: number; error: string };

export async function createBooking(input: Record<string, unknown>): Promise<Result> {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const clientType = str('client_type');
  const method = str('payment_method') as PayMethod;
  const date = str('date');
  const time = str('time');
  const service = site.services.find((s) => s.id === str('service_id'));
  const form: BookingForm = {
    firstName: str('first_name'),
    lastName: str('last_name'),
    whatsapp: str('whatsapp'),
    city: str('city') as City,
    address: str('address'),
    email: str('email'),
  };

  const today = arNow().date;
  if (clientType !== 'primera_vez' && clientType !== 'habitual') return bad('Tipo de cliente inválido.');
  if (!service) return bad('Servicio inválido.');
  if (!['mp_deposit', 'mp_full', 'transfer'].includes(method)) return bad('Método de pago inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, 6) || isSunday(date)) return bad('Fecha inválida.');
  if (!SLOTS.includes(time)) return bad('Horario inválido.');
  const errors = validateBooking(form);
  if (Object.keys(errors).length) return bad(Object.values(errors)[0]!);
  for (const v of Object.values(form)) if (v.length > 200) return bad('Datos demasiado largos.');

  const slot = (await getAvailability(date, service.durationMin)).find((s) => s.time === time);
  if (!slot?.available) return { ok: false, status: 409, error: 'Ese horario se acaba de ocupar. Elegí otro, por favor.' };

  const id = randomUUID();
  const keys = lockKeys(date, time, service.durationMin);
  // Transferencia: el horario queda tomado hasta que lo liberes a mano si la seña no llega.
  const locked = await store().lockAll(keys, id, method === 'transfer' ? null : HOLD_MINUTES * 60);
  if (!locked) return { ok: false, status: 409, error: 'Ese horario se acaba de ocupar. Elegí otro, por favor.' };

  const deposit = Math.round(service.price * 0.3);
  const dueNow = method === 'mp_full' ? service.price : deposit;
  const booking: Booking = {
    id,
    status: method === 'transfer' ? 'pending_transfer' : 'pending_payment',
    created_at: new Date().toISOString(),
    client_type: clientType,
    service: { id: service.id, name: service.name, duration_min: service.durationMin, price: service.price },
    date,
    time,
    datetime: `${date}T${time}:00-03:00`,
    payment: { method, amount_due_now: dueNow, amount_paid: 0, balance_due: service.price, mp_payment_id: '' },
    customer: {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      whatsapp: normalizeWhatsapp(form.whatsapp)!,
      email: form.email.trim().toLowerCase(),
    },
    location: { city: form.city, address: form.address.trim() },
  };
  await save(booking);

  if (method === 'transfer') {
    await notify(booking).catch((e) => console.error('[bookings] aviso de transferencia falló', booking.id, e));
    return { ok: true, booking };
  }

  try {
    const checkoutUrl = await createCheckout({
      bookingId: id,
      itemId: service.id,
      title: `${service.name} · ${site.name}`,
      description: method === 'mp_full' ? 'Pago total' : 'Seña 30%',
      amount: dueNow,
      payer: { name: booking.customer.first_name, surname: booking.customer.last_name, email: booking.customer.email },
      siteUrl: site.url,
      holdMinutes: HOLD_MINUTES,
    });
    return { ok: true, booking, checkoutUrl };
  } catch (e) {
    console.error('[bookings] no se pudo crear la preferencia de MP', id, e);
    booking.status = 'cancelled';
    await save(booking);
    await store().unlockAll(keys, id);
    return { ok: false, status: 502, error: 'No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos.' };
  }
}

const bad = (error: string): Result => ({ ok: false, status: 400, error });

/** Aplica un pago verificado contra la API de Mercado Pago (nunca datos del navegador). */
export async function applyPayment(b: Booking, p: MpPayment): Promise<Booking> {
  const keys = lockKeys(b.date, b.time, b.service.duration_min);
  const open = b.status === 'pending_payment' || b.status === 'payment_failed' || b.status === 'cancelled';

  if (p.status === 'approved' && open) {
    const amountOk = p.currency_id === 'ARS' && Math.abs((p.transaction_amount ?? 0) - b.payment.amount_due_now) < 1;
    let slotOk = await store().persistAll(keys, b.id);
    if (!slotOk) {
      // El bloqueo venció (pagó tarde): lo retomamos si nadie más tomó el horario.
      await store().unlockAll(keys, b.id);
      slotOk = await store().lockAll(keys, b.id, null);
    }
    b.status = amountOk && slotOk ? 'confirmed' : 'needs_review';
    b.payment.amount_paid = p.transaction_amount ?? 0;
    b.payment.balance_due = Math.max(0, b.service.price - b.payment.amount_paid);
    b.payment.mp_payment_id = String(p.id ?? '');
    await save(b);
    if (b.status === 'needs_review') console.error('[bookings] pago aprobado que requiere revisión', b.id, { amountOk, slotOk });
  } else if (b.status === 'pending_payment' && ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(p.status ?? '')) {
    b.status = 'payment_failed';
    await save(b);
    await store().unlockAll(keys, b.id);
  }

  await notify(b);
  return b;
}

/** Busca en Mercado Pago el estado de una reserva pendiente (por si el webhook todavía no llegó). */
export async function syncBooking(b: Booking): Promise<Booking> {
  if (b.status !== 'pending_payment') return b;
  const payments = await searchPayments(b.id);
  const p = payments.find((x) => x.status === 'approved') ?? payments[0];
  return p ? applyPayment(b, p) : b;
}

/** Libera el horario de una reserva que no se pagó (la persona volvió de MP sin pagar). */
export async function releaseBooking(b: Booking): Promise<Booking> {
  b = await syncBooking(b);
  if (b.status === 'pending_payment') {
    b.status = 'cancelled';
    await save(b);
    await store().unlockAll(lockKeys(b.date, b.time, b.service.duration_min), b.id);
  }
  return b;
}

const EVENTS: Partial<Record<BookingStatus, string>> = {
  confirmed: 'booking.confirmed',
  pending_transfer: 'booking.pending_transfer',
  needs_review: 'booking.needs_review',
};

/** Envía la reserva al webhook de automatización (n8n / Make) una sola vez por evento. Si falla, lanza error. */
async function notify(b: Booking) {
  const event = EVENTS[b.status];
  if (!event || b.notified === event) return;
  const url = process.env.AUTOMATION_WEBHOOK_URL;
  if (!url) {
    console.warn(`[bookings] AUTOMATION_WEBHOOK_URL no configurada; no se envió ${event} de ${b.id}`);
    return;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      booking_id: b.id,
      client_type: b.client_type,
      service: { name: b.service.name, duration_min: b.service.duration_min, price: b.service.price },
      datetime: b.datetime,
      payment: {
        method: b.payment.method,
        amount_paid: b.payment.amount_paid,
        balance_due: b.payment.balance_due,
        mp_payment_id: b.payment.mp_payment_id,
      },
      customer: b.customer,
      location: b.location,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Webhook de automatización respondió ${res.status}`);
  b.notified = event;
  await save(b);
}

/** Lo que el navegador puede ver de una reserva. */
export const publicView = (b: Booking) => ({
  id: b.id,
  status: b.status,
  service: b.service.name,
  date: b.date,
  time: b.time,
  method: b.payment.method,
  amount: b.payment.amount_due_now,
});
