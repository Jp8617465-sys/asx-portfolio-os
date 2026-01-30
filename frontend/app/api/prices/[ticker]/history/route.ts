import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '3M';
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  const queryParams = new URLSearchParams({ period });
  if (start_date) queryParams.set('start_date', start_date);
  if (end_date) queryParams.set('end_date', end_date);

  try {
    const res = await fetch(
      `${BASE_URL}/prices/${params.ticker}/history?${queryParams.toString()}`,
      { cache: 'no-store' }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
