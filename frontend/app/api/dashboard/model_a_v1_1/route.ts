import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_API_URL' }, { status: 500 });
  }
  if (!API_KEY) {
    return NextResponse.json({ error: 'Missing OS_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get('as_of');
  const model = searchParams.get('model') ?? 'model_a_v1_1';

  if (!asOf) {
    return NextResponse.json({ error: 'Missing as_of query param' }, { status: 400 });
  }

  const res = await fetch(
    `${BASE_URL}/dashboard/model_a_v1_1?as_of=${encodeURIComponent(asOf)}&model=${encodeURIComponent(model)}`,
    {
      headers: { 'x-api-key': API_KEY },
      cache: 'no-store',
    }
  );

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
