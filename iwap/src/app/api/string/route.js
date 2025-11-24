/**
 * @file /api/string 경로의 POST 요청을 백엔드로 전달하는 API 프록시.
 * - 백엔드에 이미지 처리를 요청합니다.
 * - Vercel 환경을 고려하여 파일 시스템 로그 대신 콘솔 로그를 사용합니다.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function POST(request) {
  const startTime = Date.now();
  console.log(`[API/string] POST request started`);

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL environment variable is not set.');
    }

    const formData = await request.formData();
    
    // 입력 파일 정보 로깅
    const file = formData.get('file'); 
    if (file && file instanceof File) {
      console.log(`[API/string] Input file: "${file.name}" | Type: "${file.type}" | Size: ${file.size} bytes`);
    } else {
      console.log("[API/string] No 'file' field in FormData.");
    }

    // 백엔드에 요청 전달
    const response = await fetch(`${BACKEND_URL}/api/string`, {
      method: 'POST',
      body: formData, 
    });
    
    const duration = Date.now() - startTime;
    console.log(`[API/string] Backend response: ${response.status} ${response.statusText} (Duration: ${duration}ms)`);

    // 백엔드 응답 처리
    const responseBody = await response.text();

    if (!response.ok) {
        console.error(`[API/string] Backend error body:\n${responseBody}`);
        throw new Error(`Backend response status: ${response.status}`);
    }

    try {
        const responseData = JSON.parse(responseBody);
        console.log(`[API/string] Success: Received task_id: ${responseData.task_id}`);
    } catch (e) {
        console.log(`[API/string] Success: Received non-JSON response from backend.`);
    }

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API/string] Proxy error: ${error.message} (Total duration: ${duration}ms)`);
    
    return new NextResponse(JSON.stringify({ message: 'Internal error in API proxy server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}