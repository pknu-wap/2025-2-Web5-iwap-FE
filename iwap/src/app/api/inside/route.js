/**
 * @file /api/inside 경로의 POST 요청을 백엔드로 전달하는 API 프록시.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function POST(request) {
  console.log('[API/inside] POST request started');

  // 1. 환경 변수 확인
  if (!BACKEND_URL) {
    console.error('[API/inside] Error: BACKEND_API_URL environment variable is not set.');
    return new NextResponse(JSON.stringify({ message: '서버 환경 변수가 설정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. 클라이언트의 FormData를 가져옴
    const formData = await request.formData();
    
    // 파일 정보 로깅 (Vercel 모니터링용)
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`[API/inside] Input file: "${value.name}" | Type: "${value.type}" | Size: ${value.size} bytes`);
      }
    }

    const targetUrl = `${BACKEND_URL}/api/inside`;

    // 3. 백엔드로 FormData를 그대로 전달
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
    });
    
    console.log(`[API/inside] Backend response: ${response.status} ${response.statusText}`);

    // 4. 백엔드의 응답을 클라이언트로 그대로 전달
    const responseBody = await response.text();

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error) {
    // 5. 프록시 과정에서 에러 발생 시
    console.error(`[API/inside] Proxy error: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버 내부 오류입니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}