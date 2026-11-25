import { createHash, timingSafeEqual } from 'node:crypto';
import { cancelBooking, getBooking, publicView } from '@/lib/server/bookings';

const hash = (s: string) => createHash('sha256').update(s).digest();

/** La clave viaja en el header `Authorization: Bearer <ADMIN_KEY>`. */
function authorized(req: Request) {
  const key = process.env.ADMIN_KEY;
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return !!key && timingSafeEqual(hash(given), hash(key));
}

// PATCH /api/bookings/:id  { "status": "cancelled" } — libera el horario de una reserva que no se confirmó.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.status !== 'cancelled') return Response.json({ error: 'Solo se admite { "status": "cancelled" }.' }, { status: 400 });

  const { id } = await ctx.params;
  const b = await getBooking(id);
  if (!b) return Response.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  return Response.json({ booking: publicView(await cancelBooking(b)) });
}
