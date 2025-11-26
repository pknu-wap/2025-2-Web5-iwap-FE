/**
 * @file /api/piano 경로의 POST 요청을 백엔드로 전달하는 API 프록시.
 * 오디오 파일을 업로드하여 MIDI 변환을 요청합니다.
 */
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;

export async function POST(request) {
  console.log(`[API/piano] POST request started`);

  if (!BACKEND_URL) {
    const msg = '[API/piano] Error: ASYNC_BACKEND_API_URL environment variable is not set.';
    console.error(msg);
    return new NextResponse(JSON.stringify({ message: 'Server environment variable configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = `${BACKEND_URL}/api/piano`;
    const contentType = request.headers.get("content-type") || "";
    
    // 헤더 설정
    const headers = {};
    if (request.headers.get("cookie")) headers["cookie"] = request.headers.get("cookie");
    if (request.headers.get("authorization")) headers["authorization"] = request.headers.get("authorization");

    let response;
    if (contentType.includes("multipart/form-data")) {
      const incomingFormData = await request.formData();
      const outgoingFormData = new FormData();
      
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          const filename = value.name || "voice.mp3";
          
          // File 객체를 ArrayBuffer로 변환하여 새로운 Blob 생성 (filename 강제 적용 보장)
          const fileBuffer = await value.arrayBuffer();
          
          // 백엔드의 엄격한 Content-Type 검사를 통과하기 위해 파라미터(codecs 등) 제거
          // 예: "audio/webm;codecs=opus" -> "audio/webm"
          const mimeType = value.type.split(';')[0];
          
          const fileBlob = new Blob([fileBuffer], { type: mimeType });
          outgoingFormData.append(key, fileBlob, filename);
        } else {
          outgoingFormData.append(key, value);
        }
      }

      // multipart/form-data의 경우 Content-Type 헤더를 직접 설정하지 않음 (boundary 자동 설정)
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers, // Content-Type 제외
        body: outgoingFormData,
        cache: 'no-store',
      });
    } else {
      if (contentType) headers["content-type"] = contentType;
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: request.body,
        cache: 'no-store',
      });
    }

    console.log(`[API/piano] Backend response: ${response.status} ${response.statusText}`);

    const responseBody = await response.text();
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    const msg = `[API/piano] Proxy error: ${error.message}`;
    console.error(msg);

    return new NextResponse(JSON.stringify({ message: 'Internal error in API proxy server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

