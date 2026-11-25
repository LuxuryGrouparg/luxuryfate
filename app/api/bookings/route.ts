import { createBooking, publicView } from '@/lib/server/bookings';

// POST /api/bookings — guarda la reserva (pending_whatsapp), bloquea el horario y avisa al webhook de automatización.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return Response.json({ error: 'JSON inválido.' }, { status: 400 });

  const r = await createBooking(body as Record<string, unknown>);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ booking: publicView(r.booking) }, { status: 201 });
}
