import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBackendBase() {
  // 서버 전용 환경 변수 우선 사용, 호환성을 위해 대체
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
    "pragma",
    "expires",
    "set-cookie",
  ];
  for (const key of passThrough) {
    const v = res.headers.get(key);
    if (v) headers.set(key, v);
  }
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const base = getBackendBase();
    const targetUrl = `${base}/api/piano/`;
    
    console.log(`[API/piano] POST request: ${targetUrl}`);

    const contentType = req.headers.get("content-type") || "";
    const commonHeaders: Record<string, string> = {
      ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
      ...(req.headers.get("authorization")
        ? { authorization: req.headers.get("authorization")! }
        : {}),
    };

    let res: Response;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      res = await fetch(targetUrl, {
        method: "POST",
        headers: commonHeaders,
        body: form,
        cache: "no-store",
      });
    } else {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          ...commonHeaders,
          ...(contentType ? { "content-type": contentType } : {}),
        },
        body: req.body,
        cache: "no-store",
      });
    }

    if (!res.ok) {
        console.error(`[API/piano] Backend response status: ${res.status}`);
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: buildProxyHeaders(res),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    console.error("[API/piano] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
