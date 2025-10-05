/**
 * @file /api/inside 경로의 API를 실제 백엔드 서버로 전달하는 프록시 역할을 합니다.
 */
import { NextResponse } from 'next/server';

// 환경변수에서 실제 백엔드 API 주소를 가져옵니다.
const BACKEND_URL = process.env.BACKEND_API_URL;

/**
 * GET 요청을 백엔드 서버로 전달하고, 그 응답을 클라이언트에게 반환합니다.
 */
export async function GET() {
  try {
    // 실제 백엔드 API로 GET 요청을 보냅니다.
    const response = await fetch(`${BACKEND_URL}/api/inside/`);

    // 백엔드로부터 받은 응답이 정상이 아니면 에러를 처리합니다.
    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.status} ${response.statusText}`);
    }

    // 백엔드로부터 받은 JSON 데이터를 그대로 클라이언트에게 전달합니다.
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('GET Proxy Error:', error);
    return new NextResponse('서버에서 데이터를 가져오는 중 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}

/**
 * 클라이언트로부터 받은 이미지 POST 요청을 백엔드 서버로 전달합니다.
 */
export async function POST(request) {
  try {
    // 클라이언트가 보낸 FormData를 그대로 가져옵니다.
    const formData = await request.formData();
    
    // 실제 백엔드 API로 FormData를 포함하여 POST 요청을 보냅니다.
    const response = await fetch(`${BACKEND_URL}/api/inside/`, {
      method: 'POST',
      body: formData,
    });

    // 백엔드로부터 받은 응답의 상태 코드를 그대로 사용하여 클라이언트에게 응답합니다.
    // 예를 들어, 백엔드가 204를 반환하면 클라이언트도 204를 받게 됩니다.
    return new NextResponse(null, { status: response.status });

  } catch (error) {
    console.error('POST Proxy Error:', error);
    return new NextResponse('데이터 처리 중 서버 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}