import { createHmac, timingSafeEqual } from 'node:crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

export type MpPayment = { id?: string | number; status?: string; transaction_amount?: number; currency_id?: string; external_reference?: string };

function client() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Falta MP_ACCESS_TOKEN.');
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
}

/** Hora de Argentina con offset, el formato que pide Mercado Pago para fechas. */
const arIso = (ms: number) => new Date(ms - 3 * 3600e3).toISOString().replace('Z', '-03:00');

export async function createCheckout(p: {
  bookingId: string;
  itemId: string;
  title: string;
  description: string;
  amount: number;
  payer: { name: string; surname: string; email: string };
  siteUrl: string;
  holdMinutes: number;
}): Promise<string> {
  const back = (r: string) => `${p.siteUrl}/?booking=${r}&id=${p.bookingId}`;
  const isPublic = p.siteUrl.startsWith('https://'); // MP rechaza auto_return y notification_url con localhost
  const pref = await new Preference(client()).create({
    body: {
      items: [{ id: p.itemId, title: p.title, description: p.description, quantity: 1, unit_price: p.amount, currency_id: 'ARS' }],
      payer: p.payer,
      external_reference: p.bookingId,
      back_urls: { success: back('success'), failure: back('failure'), pending: back('pending') },
      ...(isPublic && { auto_return: 'approved', notification_url: `${p.siteUrl}/api/mp-webhook` }),
      binary_mode: true, // solo aprobado o rechazado: sin pagos "pendientes" que bloqueen el horario
      expires: true,
      expiration_date_to: arIso(Date.now() + p.holdMinutes * 60e3),
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] }, // sin efectivo (Rapipago, Pago Fácil)
      statement_descriptor: 'LUXURY FATE',
    },
  });
  const url = process.env.MP_ACCESS_TOKEN!.startsWith('TEST-') ? pref.sandbox_init_point : pref.init_point;
  if (!url) throw new Error('Mercado Pago no devolvió init_point.');
  return url;
}

export const getPayment = (id: string): Promise<MpPayment> => new Payment(client()).get({ id });

export async function searchPayments(externalReference: string): Promise<MpPayment[]> {
  const r = await new Payment(client()).search({
    options: { external_reference: externalReference, sort: 'date_created', criteria: 'desc' },
  });
  return r.results ?? [];
}

/**
 * Valida la firma `x-signature` de las notificaciones de Mercado Pago.
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function validSignature(headers: Headers, dataId: string, secret: string): boolean {
  const sig = headers.get('x-signature') ?? '';
  const requestId = headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(sig.split(',').map((kv) => kv.trim().split('=') as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
