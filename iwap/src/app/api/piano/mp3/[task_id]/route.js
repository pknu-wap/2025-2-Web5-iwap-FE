/**
 * @file /api/piano/mp3/[task_id] 경로의 GET 요청을 백엔드로 전달하는 API 프록시.
 * 변환된 MP3 파일을 다운로드합니다.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function GET(request, { params }) {
  const { task_id } = params;
  console.log(`[API/piano/mp3] GET request started: task_id=${task_id}`);

  if (!BACKEND_URL) {
    console.error('[API/piano/mp3] Error: ASYNC_BACKEND_API_URL environment variable is not set.');
    return new NextResponse(JSON.stringify({ message: 'Server environment variable configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = `${BACKEND_URL}/api/piano/mp3/${task_id}`;
    
    const headers = {};
    if (request.headers.get("cookie")) headers["cookie"] = request.headers.get("cookie");
    if (request.headers.get("authorization")) headers["authorization"] = request.headers.get("authorization");

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store',
    });

    console.log(`[API/piano/mp3] Backend response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        const errorBody = await response.text();
        return new NextResponse(errorBody, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 바이너리 데이터 스트리밍
    const resHeaders = new Headers();
    const passThrough = ["content-type", "content-disposition", "cache-control", "content-length"];
    for (const key of passThrough) {
        const val = response.headers.get(key);
        if (val) resHeaders.set(key, val);
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error) {
    console.error(`[API/piano/mp3] Proxy error: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'Internal error in API proxy server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
