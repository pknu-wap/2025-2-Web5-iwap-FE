/**
 * @file /api/piano 경로의 POST 요청을 백엔드로 전달하는 API 프록시.
 * 오디오 파일을 업로드하여 MIDI 변환을 요청합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;
const LOG_FILE_PATH = path.join(process.cwd(), 'piano-debug.log');

function logToFile(message) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE_PATH, logMessage);
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
}

export async function POST(request) {
  logToFile(`[API/piano] POST request started`);
  console.log(`[API/piano] POST request started`);

  if (!BACKEND_URL) {
    const msg = '[API/piano] Error: ASYNC_BACKEND_API_URL environment variable is not set.';
    console.error(msg);
    logToFile(msg);
    return new NextResponse(JSON.stringify({ message: 'Server environment variable configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = `${BACKEND_URL}/api/piano`;
    const contentType = request.headers.get("content-type") || "";
    
    logToFile(`Target URL: ${targetUrl}`);
    logToFile(`Incoming Content-Type: ${contentType}`);

    // 헤더 설정
    const headers = {};
    if (request.headers.get("cookie")) headers["cookie"] = request.headers.get("cookie");
    if (request.headers.get("authorization")) headers["authorization"] = request.headers.get("authorization");

    let response;
    if (contentType.includes("multipart/form-data")) {
      logToFile('Processing multipart/form-data');
      const incomingFormData = await request.formData();
      const outgoingFormData = new FormData();
      
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          const filename = value.name || "voice.mp3";
          logToFile(`Repacking file field '${key}': name=${filename}, type=${value.type}, size=${value.size}`);
          
          // File 객체를 ArrayBuffer로 변환하여 새로운 Blob 생성 (filename 강제 적용 보장)
          const fileBuffer = await value.arrayBuffer();
          
          // 백엔드의 엄격한 Content-Type 검사를 통과하기 위해 파라미터(codecs 등) 제거
          // 예: "audio/webm;codecs=opus" -> "audio/webm"
          const mimeType = value.type.split(';')[0];
          
          const fileBlob = new Blob([fileBuffer], { type: mimeType });
          outgoingFormData.append(key, fileBlob, filename);
        } else {
          logToFile(`Repacking text field '${key}': ${value}`);
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
      logToFile('Processing other content type');
      if (contentType) headers["content-type"] = contentType;
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: request.body,
        cache: 'no-store',
      });
    }

    logToFile(`[API/piano] Backend response: ${response.status} ${response.statusText}`);
    console.log(`[API/piano] Backend response: ${response.status} ${response.statusText}`);

    const responseBody = await response.text();
    
    // 로그 가독성을 위해 유니코드 디코딩 시도
    let logBody = responseBody;
    try {
        const parsed = JSON.parse(responseBody);
        logBody = JSON.stringify(parsed, null, 2);
    } catch (e) { // eslint-disable-line no-unused-vars
        // JSON 파싱 실패 시, 단순 문자열 내 유니코드 이스케이프 시퀀스 변환 시도
        logBody = responseBody.replace(/\\u([\d\w]{4})/gi, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        });
    }
    logToFile(`Response Body: ${logBody.substring(0, 1000)}`); // Log first 1000 chars

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    const msg = `[API/piano] Proxy error: ${error.message}`;
    console.error(msg);
    logToFile(msg);
    if (error.stack) logToFile(error.stack);

    return new NextResponse(JSON.stringify({ message: 'Internal error in API proxy server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

