/**
 * @file /api/string 경로의 POST 요청을 백엔드로 전달하는 API 프록시 (디버그용).
 * - 백엔드에 이미지 처리를 "시작"시킵니다.
 * - 프록시 활동 로그, 입력 이미지를 각각 파일로 저장합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;
const DEBUG_DIR = path.join(process.cwd(), 'debug_files', 'string');

// --- 헬퍼 함수: 디렉터리 및 파일 관리 ---
async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // 이 단계의 오류는 콘솔에만 기록
    console.error(`[String API Debug] Failed to create directory ${dir}:`, error);
  }
}

async function logToFile(message) {
  await ensureDirectoryExists(DEBUG_DIR);
  const logFile = path.join(DEBUG_DIR, 'proxy.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n---\n`;
  try {
    await fs.appendFile(logFile, logMessage);
  } catch (error) {
    console.error(`[String API Debug] Failed to write to log file:`, error);
  }
}

async function saveDebugFile(subDir, fileName, content) {
  const finalDir = path.join(DEBUG_DIR, subDir);
  await ensureDirectoryExists(finalDir);
  const filePath = path.join(finalDir, fileName);
  try {
    await fs.writeFile(filePath, content);
  } catch (error) {
    console.error(`[String API Debug] Failed to save debug file ${filePath}:`, error);
  }
}

// --- API 라우트 핸들러 (POST) ---
export async function POST(request) {
  const startTime = Date.now();
  let logMessage = `CLIENT REQUEST: POST /api/string/ (Start Job)`;

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL is not defined.');
    }

    const formData = await request.formData();
    
    // 1. 디버그용 입력 파일 저장
    const file = formData.get('file'); 
    if (file && file instanceof File) {
      logMessage += `\n  - INPUT FILENAME: "${file.name}" | TYPE: "${file.type}" | SIZE: ${file.size} bytes`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      await saveDebugFile('input_images', fileName, fileBuffer);
    } else {
      logMessage += "\n  - No input file found in FormData (expected 'file' field).";
    }

    // 3. 백엔드에 요청 전달
    const response = await fetch(`${BACKEND_URL}/api/string`, {
      method: 'POST',
      body: formData, 
    });
    
    const duration = Date.now() - startTime;
    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText} (took ${duration}ms)`;

    // 4. 백엔드 응답 처리
    const responseBody = await response.text();

    if (!response.ok) {
        let decodedError = responseBody;
        try {
          const errorJson = JSON.parse(responseBody);
          decodedError = JSON.stringify(errorJson, null, 2);
        } catch (e) { /* no-op */ }
        logMessage += `\n  -> BACKEND ERROR BODY:\n${decodedError}`;
        await logToFile(logMessage);
        throw new Error(`Backend responded with status ${response.status}`);
    }

    try {
        const responseData = JSON.parse(responseBody);
        logMessage += `\n  -> SUCCESS: Received task_id: ${responseData.task_id}`;
    } catch (e) {
        logMessage += `\n  -> SUCCESS: Received non-JSON response from backend.`;
    }

    // 5. 성공 로그 기록 및 응답 전달
    await logToFile(logMessage);

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    // 6. 실패 로그 기록
    const errorMessage = logMessage + `\n  -> PROXY ERROR: ${error.message} (total time: ${duration}ms)`;
    console.error(`[/api/string] API Proxy Error:`, error);
    await logToFile(errorMessage);
    
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}