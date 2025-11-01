/**
 * @file /api/inside 경로의 요청을 백엔드로 전달하는 API 프록시.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function POST(request) {
  try {
    // 클라이언트로부터 받은 FormData를 그대로 백엔드로 전달합니다.
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/inside/`, {
      method: 'POST',
      body: formData,
    });

    // 백엔드 서버의 응답을 그대로 클라이언트로 전달합니다.
    const responseBody = await response.text();
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    console.error(`[route.js] API Proxy Error: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}