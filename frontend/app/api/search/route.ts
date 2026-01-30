import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  const queryParams = new URLSearchParams({ q: query });

  const res = await fetch(`${BASE_URL}/search?${queryParams.toString()}`, {
    headers: { 'x-api-key': API_KEY },
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
