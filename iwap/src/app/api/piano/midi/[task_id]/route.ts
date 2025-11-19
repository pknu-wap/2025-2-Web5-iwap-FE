import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBackendBase() {
  const base =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!base) throw new Error("Missing BACKEND_API_URL");
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

type RouteParams = {
  task_id?: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const taskId = params.task_id?.trim();
    if (!taskId) {
      return new Response(JSON.stringify({ error: "Missing task_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const base = getBackendBase();
    const targetUrl = `${base}/api/piano/midi/${encodeURIComponent(taskId)}`;
    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
    });
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: buildProxyHeaders(res),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
