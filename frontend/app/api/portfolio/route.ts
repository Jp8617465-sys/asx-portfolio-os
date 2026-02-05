import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeysRecursive(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysRecursive(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = toCamelCase(key);
      acc[camelKey] = transformKeysRecursive(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_API_URL' }, { status: 500 });
  }

  // Get JWT token from cookie
  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BASE_URL}/portfolio`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    return new NextResponse(errorText, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();
  const transformed = transformKeysRecursive(data);

  return NextResponse.json(transformed);
}
