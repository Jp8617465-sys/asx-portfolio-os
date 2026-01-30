import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
const API_KEY = process.env.OS_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') ?? '7';
  const limit = searchParams.get('limit') ?? '20';

  try {
    const params = new URLSearchParams({ days, limit });

    const res = await fetch(`${BASE_URL}/news/sentiment/summary?${params.toString()}`, {
      headers: {
        'x-api-key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('News sentiment summary proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news sentiment summary', detail: error.message },
      { status: 500 }
    );
  }
}
