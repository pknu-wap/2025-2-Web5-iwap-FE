/**
 * @file /api/string 경로의 요청을 백엔드로 전달하는 API 프록시 (디버그용).
 * - 프록시 활동 로그, 입력 이미지, 출력 JSON을 각각 파일로 저장합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_API_URL;
const DEBUG_DIR = path.join(process.cwd(), 'debug_files', 'string');

// --- 헬퍼 함수: 디렉터리 및 파일 관리 ---
async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`[String API Debug] Failed to create directory ${dir}:`, error);
  }
}

async function logToFile(message) {
  await ensureDirectoryExists(DEBUG_DIR);
  const logFile = path.join(DEBUG_DIR, 'proxy.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n---\n`;
  await fs.appendFile(logFile, logMessage);
}

async function saveDebugFile(subDir, fileName, content) {
  const finalDir = path.join(DEBUG_DIR, subDir);
  await ensureDirectoryExists(finalDir);
  const filePath = path.join(finalDir, fileName);
  await fs.writeFile(filePath, content);
}

// --- API 라우트 핸들러 (디버깅 로그 추가 버전) ---
export async function POST(request) {
  let logMessage = `CLIENT REQUEST: POST /api/string/`;

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL is not defined.');
    }

    const formData = await request.formData();
    const file = formData.get('image'); // 필드 이름 확인 필요 ('image'가 맞는지)

    if (file && file instanceof File) {
      logMessage += `\n  - INPUT FILENAME: "${file.name}" | TYPE: "${file.type}" | SIZE: ${file.size} bytes`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      await saveDebugFile('input_images', fileName, fileBuffer);
    } else {
      logMessage += "\n  - No input file found in FormData.";
    }

    const response = await fetch(`${BACKEND_URL}/api/string/`, {
      method: 'POST',
      body: formData,
    });
    
    const responseBody = await response.text();
    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;
    
    await logToFile(logMessage);

    if (response.ok && responseBody) {
      const fileName = `${Date.now()}_output.json`;
      await saveDebugFile('output_json', fileName, responseBody);
    }

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error) {
    const errorMessage = logMessage + `\n  -> PROXY ERROR: ${error.message}`;
    console.error(`[/api/string] API Proxy Error:`, error);
    await logToFile(errorMessage);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}