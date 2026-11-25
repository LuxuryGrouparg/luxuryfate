// Validación de los datos de la reserva. Se usa en el navegador y, desde la etapa 3, en el servidor.

export type City = 'corrientes' | 'resistencia';

export type BookingForm = {
  firstName: string;
  lastName: string;
  whatsapp: string; // lo que escribió la persona, sin el +54 9
  city: City;
  address: string;
  email: string;
};

export type FormErrors = Partial<Record<keyof BookingForm, string>>;

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
  if (f.firstName.trim().length < 2) e.firstName = 'Ingresá tu nombre.';
  if (f.lastName.trim().length < 2) e.lastName = 'Ingresá tu apellido.';
  if (!normalizeWhatsapp(f.whatsapp)) e.whatsapp = 'Ingresá código de área y número, sin 0 ni 15. Ej.: 379 555 0123.';
  if (f.city !== 'corrientes' && f.city !== 'resistencia') e.city = 'Elegí una ciudad.';
  if (f.address.trim().length < 5) e.address = 'Ingresá la dirección completa.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Ingresá un email válido.';
  return e;
}
