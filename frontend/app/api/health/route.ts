import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_API_URL' }, { status: 500 });
  }

  const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
