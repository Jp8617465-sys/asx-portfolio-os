import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '50';

  const queryParams = new URLSearchParams({ limit });

  const res = await fetch(`${BASE_URL}/accuracy/${params.ticker}?${queryParams.toString()}`, {
    headers: { 'x-api-key': API_KEY },
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
