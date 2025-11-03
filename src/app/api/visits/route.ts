import { NextRequest } from 'next/server';

let total = 0;
const perDay = new Map<string, number>();

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = perDay.get(today) || 0;
  return Response.json({ today: todayCount, total });
}

export async function POST(_req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  total += 1;
  perDay.set(today, (perDay.get(today) || 0) + 1);
  return Response.json({ ok: true });
}
