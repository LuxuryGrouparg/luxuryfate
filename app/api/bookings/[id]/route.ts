import { getBooking, publicView, syncBooking } from '@/lib/server/bookings';

// GET /api/bookings/:id — estado de la reserva al volver de Mercado Pago.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let b = await getBooking(id);
  if (!b) return Response.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  try {
    b = await syncBooking(b);
  } catch (e) {
    console.error('[bookings] no se pudo consultar MP', id, e); // se responde con el último estado guardado
  }
  return Response.json({ booking: publicView(b) }, { headers: { 'Cache-Control': 'no-store' } });
}
