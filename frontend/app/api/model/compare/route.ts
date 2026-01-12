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
  const model = searchParams.get("model") ?? "model_a_ml";
  const leftVersion = searchParams.get("left_version");
  const rightVersion = searchParams.get("right_version");

  const params = new URLSearchParams({ model });
  if (leftVersion) params.set("left_version", leftVersion);
  if (rightVersion) params.set("right_version", rightVersion);

  const res = await fetch(`${BASE_URL}/model/compare?${params.toString()}`, {
    headers: { "x-api-key": API_KEY },
    cache: "no-store"
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
