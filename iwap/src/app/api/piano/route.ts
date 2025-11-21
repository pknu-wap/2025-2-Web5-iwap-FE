import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBackendBase() {
  // Prefer server-only env, fall back for compatibility
  const base = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!base) throw new Error("Missing BACKEND_API_URL");
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

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: buildProxyHeaders(res),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    console.error("[proxy:/api/piano]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
