/**
 * @file /api/inside/[task_id] 경로의 GET 요청을 백엔드로 전달하는 API 프록시.
 * 클라이언트가 폴링(polling)을 통해 feature map 데이터를 조회할 때 사용됩니다.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function GET(request, { params }) {
  const { task_id } = params;
  console.log(`[API/inside] GET request started: task_id=${task_id}`);

  // 1. 환경 변수 확인
  if (!BACKEND_URL) {
    console.error('[API/inside] Error: BACKEND_API_URL environment variable is not set.');
    return new NextResponse(JSON.stringify({ message: 'Server environment variable configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = `${BACKEND_URL}/api/inside/${task_id}`;

    // 2. 백엔드로 GET 요청 전달 (캐시 사용 안 함)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', 
    });

    console.log(`[API/inside] Backend response: ${response.status} ${response.statusText}`);

    // 3. 백엔드의 응답을 클라이언트로 그대로 전달
    const responseBody = await response.text();
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    // 4. 프록시 과정에서 에러 발생 시
    console.error(`[API/inside] Proxy error: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'Internal error in API proxy server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}