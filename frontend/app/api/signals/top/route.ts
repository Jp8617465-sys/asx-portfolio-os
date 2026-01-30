import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '5';
  const signal = searchParams.get('signal');

  const params = new URLSearchParams({ limit });
  if (signal) params.set('signal', signal);

  try {
    const res = await fetch(`${BASE_URL}/signals/live?${params.toString()}`, {
      headers: { 'x-api-key': API_KEY },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Failed to fetch top signals:', error);
    return NextResponse.json({ error: 'Failed to fetch top signals' }, { status: 500 });
  }
}
