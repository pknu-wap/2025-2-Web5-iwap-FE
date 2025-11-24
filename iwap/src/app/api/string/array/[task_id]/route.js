import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

// --- API 라우트 핸들러 (GET) ---
export async function GET(request, { params }) {
  const { task_id } = params;
  console.log(`[API/string/array] GET request: task_id=${task_id}`);

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL environment variable is not set.');
    }

    const response = await fetch(`${BACKEND_URL}/api/string/array/${task_id}`, {
      method: 'GET',
      cache: 'no-store',
    });

    // 202 (Accepted/Pending) 응답은 로그 없이 바로 클라이언트에 전달
    if (response.status === 202) {
      return new NextResponse(await response.text(), {
        status: 202,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
      });
    }

    console.log(`[API/string/array] Backend response: ${response.status} ${response.statusText}`);
    const responseBody = await response.text();

    if (!response.ok) {
      console.error(`[API/string/array] Backend error body:\n${responseBody}`);
      throw new Error(`Backend response status: ${response.status}`);
    }

    // 성공 시 로그 기록
    console.log(`[API/string/array] Success: Received coordinate data for task_id ${task_id}.`);
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });

  } catch (error) {
    console.error(`[API/string/array] Proxy error: ${error.message}`);
    
    return new NextResponse(JSON.stringify({ message: 'Proxy error requesting coordinates' }), {
      status: 500,
    });
  }
}
