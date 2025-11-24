import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

// --- API 라우트 핸들러 (GET) ---
export async function GET(request, { params }) {
  const { task_id } = params;
  console.log(`[API/string/image] GET request: task_id=${task_id}`);

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL environment variable is not set.');
    }

    const response = await fetch(`${BACKEND_URL}/api/string/image/${task_id}`, {
      method: 'GET',
      cache: 'no-store',
    });
    
    if (response.status === 202) {
        return new NextResponse(await response.text(), {
            status: 202,
            headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
        });
    }

    console.log(`[API/string/image] Backend response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API/string/image] Backend error body:\n${errorText}`);
      throw new Error(`Backend response status: ${response.status}`);
    }
    
    const contentType = response.headers.get('Content-Type') || '';

    if (response.status === 200 && contentType.startsWith('image/')) {
        console.log(`[API/string/image] Success: Received image for task_id ${task_id}. (Type: ${contentType})`);
        const imageBlob = await response.blob();
        
        return new NextResponse(imageBlob, {
            status: 200,
            headers: { 'Content-Type': contentType },
        });
    }

    const unexpectedBody = await response.text();
    throw new Error(`Unexpected response from backend. Status: ${response.status}, Content-Type: ${contentType}, Body: ${unexpectedBody}`);

  } catch (error) {
    console.error(`[API/string/image] Proxy error: ${error.message}`);
    
    return new NextResponse(JSON.stringify({ message: 'Proxy error requesting image' }), {
      status: 500,
    });
  }
}