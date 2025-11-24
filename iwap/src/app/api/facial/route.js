// import { NextResponse } from "next/server"; // [삭제] 사용하지 않음

// Next.js 설정: 동적 렌더링 및 Node.js 런타임 사용
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 백엔드 기본 URL을 가져옵니다.
 * 환경 변수가 설정되어 있지 않으면 에러를 발생시킵니다.
 */
function getBackendBase() {
  const base = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!base) throw new Error("Missing BACKEND_API_URL environment variable");
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/**
 * 백엔드 응답 헤더 중 클라이언트로 전달할 헤더를 필터링하여 구성합니다.
 * 이미지 관련 헤더(content-type 등)를 유지하는 것이 중요합니다.
 */
function buildProxyHeaders(backendResponse) {
  const headers = new Headers();
  const passThrough = [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
    "pragma",
    "expires",
  ];

  for (const key of passThrough) {
    const value = backendResponse.headers.get(key);
    if (value) headers.set(key, value);
  }
  return headers;
}

// API 명세에 허용된 파라미터 목록
const ALLOWED_PARAMS = [
  'male',
  'smiling',
  'pale_skin',
  'eyeglasses',
  'mustache',
  'wearing_lipstick',
  'young',
];

/**
 * GET 핸들러
 * 클라이언트의 요청 파라미터를 받아 백엔드로 프록시합니다.
 * * @param {Request} req 
 */
export async function GET(req) {
  try {
    const base = getBackendBase();
    const { searchParams } = new URL(req.url);
    const backendParams = new URLSearchParams();

    // --- [DEBUG] 요청 파라미터 로깅 ---
    console.log(`[API/Facial] Received params: ${searchParams.toString()}`);

    // 허용된 파라미터만 필터링하고, 값이 없으면 기본값 0.0 설정
    for (const param of ALLOWED_PARAMS) {
      const rawValue = searchParams.get(param);
      // 숫자로 변환 가능한지 확인 (기본값 0.0)
      const numValue = rawValue === null || rawValue === '' ? 0.0 : Number(rawValue);
      
      // 유효한 숫자인 경우에만 추가
      if (Number.isFinite(numValue)) {
        backendParams.set(param, String(numValue));
      } else {
        backendParams.set(param, '0.0');
      }
    }

    // 최종 타겟 URL 생성
    const targetUrl = `${base}/api/facial?${backendParams.toString()}`;
    
    // --- [DEBUG] 타겟 URL 로깅 ---
    console.log(`[API/Facial] Proxying to: ${targetUrl}`);

    // 백엔드 호출
    const res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        // 필요한 경우 인증 헤더 전달
        ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie") } : {}),
        ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization") } : {}),
      },
    });

    if (!res.ok) {
      console.error(`[API/Facial] Backend responded with status: ${res.status}`);
      throw new Error(`Backend error: ${res.statusText}`);
    }

    // 이미지 바이너리 스트림 그대로 반환
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: buildProxyHeaders(res),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    console.error("[API/Facial] Error:", message);
    
    return new Response(JSON.stringify({ error: message }), {
      status: 502, // Bad Gateway
      headers: { "content-type": "application/json" },
    });
  }
}