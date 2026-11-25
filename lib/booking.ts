// Reglas de la reserva compartidas entre el navegador y el servidor.
import { site } from '../config/site.ts';

export type City = 'corrientes' | 'resistencia';
export type ClientType = 'nuevo' | 'habitual';

export type BookingForm = {
  firstName: string;
  lastName: string;
  whatsapp: string; // lo que escribió la persona, sin el +54 9
  city: City;
  address: string;
  note: string; // opcional
};

export type FormErrors = Partial<Record<keyof BookingForm, string>>;

export const NOTE_MAX = 300;
/** Solo letras (con tildes y ñ) y espacios: "María José". */
const NAME_RE = /^\p{L}[\p{L} ]*$/u;

/** Celular argentino → '+549XXXXXXXXXX' (código de área sin 0 + número, 10 dígitos), o null si no es válido. */
export function normalizeWhatsapp(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return /^[1-9]\d{9}$/.test(d) ? `+549${d}` : null;
}

export function validateBooking(f: BookingForm): FormErrors {
  const e: FormErrors = {};
  const name = (v: string, what: string) =>
    v.trim().length < 2 ? `Ingresá tu ${what} (mínimo 2 letras).` : !NAME_RE.test(v.trim()) ? `Usá solo letras y espacios en tu ${what}.` : null;
  const fn = name(f.firstName, 'nombre');
  const ln = name(f.lastName, 'apellido');
  if (fn) e.firstName = fn;
  if (ln) e.lastName = ln;
  if (!normalizeWhatsapp(f.whatsapp)) e.whatsapp = 'Ingresá código de área y número (10 dígitos), sin 0 ni 15. Ej.: 379 555 0123.';
  if (f.city !== 'corrientes' && f.city !== 'resistencia') e.city = 'Elegí una ciudad.';
  if (f.address.trim().length < 5 || !/\d/.test(f.address)) e.address = 'Ingresá calle y número (mínimo 5 caracteres).';
  if (f.note.length > NOTE_MAX) e.note = `Máximo ${NOTE_MAX} caracteres.`;
  return e;
}

/** ¿El beneficio "Martes de Studio" aplica a este día ('YYYY-MM-DD')? */
export function isPromoDay(date: string) {
  const p = site.promos.martesStudio;
  return p.active && new Date(`${date}T12:00:00Z`).getUTCDay() === p.weekday;
}

/** Precio final de un servicio en un día, con el beneficio aplicado si corresponde. */
export function priceFor(serviceId: string, date: string | null): { price: number; promo: 'martes_studio' | null } {
  const p = site.promos.martesStudio;
  if (date && serviceId === p.serviceId && isPromoDay(date)) return { price: p.price, promo: 'martes_studio' };
  return { price: site.services.find((s) => s.id === serviceId)?.price ?? 0, promo: null };
}
