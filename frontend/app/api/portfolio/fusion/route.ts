import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
const API_KEY = process.env.OS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${BASE_URL}/portfolio/overview`, {
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
    console.error('Portfolio fusion proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio fusion data', detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const res = await fetch(`${BASE_URL}/portfolio/refresh`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Portfolio fusion refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh portfolio fusion', detail: error.message },
      { status: 500 }
    );
  }
}
