import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.ASYNC_BACKEND_API_URL;
const DEBUG_DIR = path.join(process.cwd(), 'debug_files', 'string');

// --- 헬퍼 함수: 디렉터리 및 로그 ---
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

// --- API 라우트 핸들러 (GET) ---
export async function GET(request, { params }) {
  const { task_id } = params;
  let logMessage = `CLIENT REQUEST: GET /api/string/array/${task_id}`;

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL is not defined.');
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

    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;
    const responseBody = await response.text();

    if (!response.ok) {
      let decodedError = responseBody;
      try {
        const errorJson = JSON.parse(responseBody);
        decodedError = JSON.stringify(errorJson, null, 2);
      } catch (e) { /* no-op */ }
      logMessage += `\n  -> BACKEND ERROR BODY:\n${decodedError}`;
      await logToFile(logMessage); // 실패 시에만 상세 로그 기록
      throw new Error(`Backend responded with status ${response.status}`);
    }

    // 성공 시에만 로그 기록
    logMessage += `\n  -> SUCCESS: Fetched coordinate data for task ${task_id}.`;
    const fileName = `${task_id}_coordinates.json`;
    try {
      const jsonData = JSON.parse(responseBody);
      await saveDebugFile('output_data', fileName, JSON.stringify(jsonData, null, 2));
    } catch (e) {
      await saveDebugFile('output_data', fileName, responseBody);
    }
    logMessage += `\n  - Saved formatted coordinate data to ${fileName}`;
    await logToFile(logMessage);
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });

  } catch (error) {
    const errorMessage = `CLIENT REQUEST: GET /api/string/array/${task_id}\n  -> PROXY ERROR: ${error.message}`;
    console.error(`[/api/string/array/${task_id}] API Proxy Error:`, error);
    await logToFile(errorMessage);
    
    return new NextResponse(JSON.stringify({ message: '좌표값 요청 프록시 오류' }), {
      status: 500,
    });
  }
}
