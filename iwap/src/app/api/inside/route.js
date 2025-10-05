/**
 * @file /api/inside 경로의 요청을 실제 백엔드 서버로 전달하는 API 프록시(Proxy).
 * Next.js 서버를 경유지로 사용하여 클라이언트와 백엔드 간의 통신을 중계함.
 * CORS 문제 해결 및 백엔드 URL 은닉에 유용함.
 */
import { NextResponse } from 'next/server';

// .env 파일에 정의된 실제 백엔드 API 서버의 주소.
const BACKEND_URL = process.env.BACKEND_API_URL;

/**
 * GET 요청 프록시 핸들러.
 * 클라이언트의 GET 요청을 백엔드로 전달하고, 백엔드의 응답을 다시 클라이언트로 반환함.
 */
export async function GET() {
  try {
    // 백엔드 서버의 '/api/inside/' 엔드포인트로 GET 요청 전송.
    const response = await fetch(`${BACKEND_URL}/api/inside/`);

    // 백엔드 응답의 HTTP 상태 코드가 2xx가 아닐 경우, 에러로 처리함.
    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.status} ${response.statusText}`);
    }

    // 백엔드로부터 받은 JSON 응답을 파싱함.
    const data = await response.json();
    // 파싱된 데이터를 클라이언트에게 JSON 형태로 응답함.
    return NextResponse.json(data);

  } catch (error) {
    // 프록시 과정에서 발생한 모든 에러를 콘솔에 기록.
    console.error('GET Proxy Error:', error);
    // 클라이언트에게 500 서버 내부 오류 응답을 반환.
    return new NextResponse('서버에서 데이터를 가져오는 중 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}

/**
 * POST 요청 프록시 핸들러.
 * 클라이언트가 전송한 이미지(FormData)를 백엔드로 전달함.
 */
export async function POST(request) {
  try {
    // 클라이언트 요청에서 FormData 객체를 추출함.
    const formData = await request.formData();
    
    // 백엔드 서버로 FormData를 body에 담아 POST 요청 전송.
    // Content-Type 헤더는 fetch가 FormData를 보고 자동으로 'multipart/form-data'로 설정함.
    const response = await fetch(`${BACKEND_URL}/api/inside/`, {
      method: 'POST',
      body: formData,
    });

    // 백엔드 서버의 응답 상태 코드를 그대로 클라이언트에게 반환.
    // 예를 들어, 백엔드가 성공적으로 처리하고 내용 없이 204 No Content를 반환하면,
    // 클라이언트도 동일하게 204 응답을 받게 됨.
    return new NextResponse(null, { status: response.status });

  } catch (error) {
    // 프록시 과정에서 발생한 모든 에러를 콘솔에 기록.
    console.error('POST Proxy Error:', error);
    // 클라이언트에게 500 서버 내부 오류 응답을 반환.
    return new NextResponse('데이터 처리 중 서버 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}