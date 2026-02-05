import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '1000';
  const signalFilter = searchParams.get('signal_filter');
  const agreementOnly = searchParams.get('agreement_only');
  const noConflict = searchParams.get('no_conflict');

  const params = new URLSearchParams({ limit });
  if (signalFilter) params.set('signal_filter', signalFilter);
  if (agreementOnly) params.set('agreement_only', agreementOnly);
  if (noConflict) params.set('no_conflict', noConflict);

  const res = await fetch(`${BASE_URL}/signals/ensemble/latest?${params.toString()}`, {
    headers: { 'x-api-key': API_KEY },
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
