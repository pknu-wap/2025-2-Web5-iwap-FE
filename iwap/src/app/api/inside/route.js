/**
 * @file /api/inside 경로의 POST 요청을 백엔드로 전달하는 API 프록시.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function POST(request) {
  // 1. 환경 변수 확인
  if (!BACKEND_URL) {
    console.error('[API Proxy Error] BACKEND_API_URL이 서버 환경 변수에 설정되지 않았습니다.');
    return new NextResponse(JSON.stringify({ message: '서버 환경 변수가 설정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. 클라이언트의 FormData를 가져옴
    const formData = await request.formData();
    
    const targetUrl = `${BACKEND_URL}/api/inside`;

    // 3. 백엔드로 FormData를 그대로 전달
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
    });
    
    // 4. 백엔드의 응답을 클라이언트로 그대로 전달
    const responseBody = await response.text();

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error) {
    // 5. 프록시 과정에서 에러 발생 시
    console.error(`[API Proxy Error] POST /api/inside: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}