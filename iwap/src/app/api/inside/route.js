/**
 * @file /api/inside 경로의 요청을 백엔드로 전달하는 API 프록시.
 * - 모든 요청의 메타데이터를 로그 파일에 기록합니다.
 * - GET 응답(JSON)과 POST 요청(파일)의 실제 내용을 로컬에 저장합니다.
 * - 백엔드의 응답 코드, 메시지, 본문까지 상세히 로깅합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises'; // 비동기 파일 시스템 모듈
import path from 'path';     // 파일 경로 관리를 위한 모듈

const BACKEND_URL = process.env.BACKEND_API_URL;

// --- 헬퍼 함수: 디렉터리 및 파일 관리 ---

async function ensureDirectoriesExist(dirs) {
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
    }
  }
}

async function logToFile(message) {
  const logDir = path.join(process.cwd(), 'logs');
  await ensureDirectoriesExist([logDir]);
  const logFile = path.join(logDir, 'requests.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n---\n`;
  
  await fs.appendFile(logFile, logMessage);
}

async function saveDebugFile(subDir, fileName, content) {
  const debugDir = path.join(process.cwd(), 'debug_files', subDir);
  await ensureDirectoriesExist([debugDir]);
  const filePath = path.join(debugDir, fileName);
  
  await fs.writeFile(filePath, content);
}


// --- API 라우트 핸들러 ---

export async function GET(request) {
  const url = request.nextUrl.pathname;
  let logMessage = `CLIENT REQUEST: GET, URL: ${url}`;
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/inside/`);
    
    const clonedResponse = response.clone();
    const responseBody = await clonedResponse.text();
    
    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;
    if(responseBody) {
        logMessage += `\n  -> RESPONSE BODY:\n${responseBody}`;
    }
    await logToFile(logMessage);

    if (response.ok) {
        const fileName = `${Date.now()}_response.json`;
        await saveDebugFile('get', fileName, JSON.stringify(JSON.parse(responseBody), null, 2));
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });

  } catch (error) {
    const errorMessage = logMessage + `\n  -> PROXY ERROR: GET - ${error.message}`;
    console.error(errorMessage);
    await logToFile(errorMessage);
    return new NextResponse('프록시 서버 오류', { status: 500 });
  }
}

export async function POST(request) {
  const url = request.nextUrl.pathname;
  let logMessage = `CLIENT REQUEST: POST, URL: ${url}`;

  try {
    const formData = await request.formData();
    const file = formData.get('num_image');

    if (file && file instanceof File) {
      logMessage += `\n  - FILENAME: "${file.name}"\n  - TYPE: "${file.type}"\n  - SIZE: ${file.size} bytes`;

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      await saveDebugFile('post', fileName, fileBuffer);
    } else {
      logMessage += "\n  - No file found in FormData.";
    }

    const response = await fetch(`${BACKEND_URL}/api/inside/`, {
      method: 'POST',
      body: formData,
    });
    
    const responseBody = await response.text();

    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;
    if(responseBody) {
      logMessage += `\n  -> RESPONSE BODY: ${responseBody}`;
    }
    await logToFile(logMessage);

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'text/plain' }
    });

  } catch (error) {
    const errorMessage = logMessage + `\n  -> PROXY ERROR: POST - ${error.message}`;
    console.error(errorMessage);
    await logToFile(errorMessage);
    return new NextResponse('프록시 서버 오류', { status: 500 });
  }
}