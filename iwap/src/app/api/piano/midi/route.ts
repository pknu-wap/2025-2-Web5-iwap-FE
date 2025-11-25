import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBackendBase() {
  const base = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!base) throw new Error("Missing BACKEND_API_URL environment variable.");
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function buildProxyHeaders(res: Response) {
  const headers = new Headers();
  const passThrough = [
    "content-type",
    "content-disposition",
    "cache-control",
    "set-cookie",
  ];
  for (const key of passThrough) {
    const v = res.headers.get(key);
    if (v) headers.set(key, v);
  }
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const base = getBackendBase();
    const search = req.nextUrl.search;
    const targetUrl = `${base}/api/piano/midi${search}`;
    
    console.log(`[API/piano/midi] GET request: ${targetUrl}`);

    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
    });

    if (!res.ok) {
        console.error(`[API/piano/midi] Backend response status: ${res.status}`);
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: buildProxyHeaders(res),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    console.error(`[API/piano/midi] Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
