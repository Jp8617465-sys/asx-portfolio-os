import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
const API_KEY = process.env.OS_API_KEY || '';

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const { ticker } = params;

  try {
    const res = await fetch(`${BASE_URL}/signals/model_b/${ticker}`, {
      headers: {
        'x-api-key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: 'No Model B signal found for this ticker' },
          { status: 404 }
        );
      }
      throw new Error(`Backend returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Model B signal for ${ticker} proxy error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch Model B signal', detail: error.message },
      { status: 500 }
    );
  }
}
