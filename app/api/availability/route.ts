import { getAvailability } from '@/lib/availability';

// GET /api/availability?date=YYYY-MM-DD&duration=NN
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const date = params.get('date') ?? '';
  const duration = Number(params.get('duration'));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return Response.json({ error: 'Parámetro date inválido (YYYY-MM-DD).' }, { status: 400 });
  }
  if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
    return Response.json({ error: 'Parámetro duration inválido (minutos).' }, { status: 400 });
  }

  const slots = await getAvailability(date, duration);
  return Response.json({ date, duration, slots }, { headers: { 'Cache-Control': 'no-store' } });
}
