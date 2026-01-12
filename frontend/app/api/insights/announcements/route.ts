import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.OS_API_KEY;

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_API_URL" }, { status: 500 });
  }
  if (!API_KEY) {
    return NextResponse.json({ error: "Missing OS_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const lookbackDays = searchParams.get("lookback_days");

  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (lookbackDays) params.set("lookback_days", lookbackDays);

  const url = `${BASE_URL}/insights/asx_announcements${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: { "x-api-key": API_KEY },
    cache: "no-store"
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
