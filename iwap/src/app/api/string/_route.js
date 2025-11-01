/**
 * @file /api/string 경로의 요청을 백엔드로 전달하는 API 프록시.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function POST(request) {
  if (!BACKEND_URL) {
    console.error('[API Proxy Error] BACKEND_API_URL is not defined.');
    return new NextResponse(JSON.stringify({ message: '서버 설정 오류: 백엔드 주소가 지정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/string/`, { // 백엔드 엔드포인트에 맞게 수정
      method: 'POST',
      body: formData,
    });

    const responseBody = await response.text();
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    console.error(`[/api/string] API Proxy Error: ${error.message}`);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}