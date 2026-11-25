import { applyPayment, getBooking } from '@/lib/server/bookings';
import { getPayment, validSignature } from '@/lib/server/mp';

// POST /api/mp-webhook — notificaciones de Mercado Pago.
// Responder 200 rápido; si algo falla devolvemos 500 y MP reintenta.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const dataId = String(url.searchParams.get('data.id') ?? body.data?.id ?? url.searchParams.get('id') ?? '');

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && !validSignature(req.headers, dataId, secret)) {
    return Response.json({ error: 'Firma inválida.' }, { status: 401 });
  }
  if (type !== 'payment' || !dataId) return Response.json({ ignored: true });

  try {
    // No confiamos en el body: el pago se lee de la API de Mercado Pago.
    const payment = await getPayment(dataId);
    const booking = payment.external_reference ? await getBooking(payment.external_reference) : null;
    if (!booking) return Response.json({ ignored: true });
    const b = await applyPayment(booking, payment);
    return Response.json({ id: b.id, status: b.status });
  } catch (e) {
    console.error('[mp-webhook] error procesando pago', dataId, e);
    return Response.json({ error: 'Error procesando el pago.' }, { status: 500 });
  }
}
