import { getBooking, publicView, releaseBooking } from '@/lib/server/bookings';

// POST /api/bookings/:id/release — libera el horario si la persona volvió de MP sin pagar.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await getBooking(id);
  if (!b) return Response.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  try {
    return Response.json({ booking: publicView(await releaseBooking(b)) });
  } catch (e) {
    console.error('[bookings] no se pudo liberar', id, e);
    return Response.json({ error: 'No se pudo liberar la reserva.' }, { status: 502 });
  }
}
