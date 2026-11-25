import { getAvailability } from '@/lib/availability';

// GET /api/availability?date=YYYY-MM-DD — turnos de 1 hora del día.
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return Response.json({ error: 'Parámetro date inválido (YYYY-MM-DD).' }, { status: 400 });
  }
  const slots = await getAvailability(date);
  return Response.json({ date, slots }, { headers: { 'Cache-Control': 'no-store' } });
}
