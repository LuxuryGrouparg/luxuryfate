import { createBooking, publicView } from '@/lib/server/bookings';
import { store } from '@/lib/server/store';

const LIMIT = 3; // reservas por IP…
const WINDOW_SEC = 10 * 60; // …cada 10 minutos

// POST /api/bookings — guarda la reserva (pending_whatsapp), bloquea el horario y avisa al webhook de automatización.
export async function POST(req: Request) {
  // En Vercel, el primer valor de x-forwarded-for es la IP real del visitante.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if ((await store().hit(`rate:bookings:${ip}`, WINDOW_SEC)) > LIMIT) {
    return Response.json({ error: 'Hiciste varias reservas seguidas. Esperá unos minutos o escribinos por WhatsApp.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return Response.json({ error: 'JSON inválido.' }, { status: 400 });

  // Trampa para bots completa: se responde como si nada y no se guarda ni se bloquea nada.
  if ((body as { website?: unknown }).website) return Response.json({ booking: null }, { status: 201 });

  const r = await createBooking(body as Record<string, unknown>);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ booking: publicView(r.booking) }, { status: 201 });
}
