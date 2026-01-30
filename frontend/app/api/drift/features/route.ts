import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
const API_KEY = process.env.OS_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const feature_name = searchParams.get('feature_name');
  const status = searchParams.get('status');

  try {
    const params = new URLSearchParams();
    if (feature_name) params.set('feature_name', feature_name);
    if (status) params.set('status', status);

    const res = await fetch(`${BASE_URL}/drift/features?${params.toString()}`, {
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
    console.error('Drift features proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature drift data', detail: error.message },
      { status: 500 }
    );
  }
}
