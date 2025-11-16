import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
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

// --- API 라우트 핸들러 (GET) ---
export async function GET(request) {
  let logMessage = `CLIENT REQUEST: GET /api/string/coordinates/`;

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL is not defined.');
    }

    // 1. 백엔드로 쿠키(세션) 전달
    const cookie = request.headers.get('Cookie');
    const fetchHeaders = new Headers();
    if (cookie) {
      fetchHeaders.append('Cookie', cookie);
      logMessage += `\n  - Forwarding cookie.`;
    } else {
      logMessage += `\n  - No cookie found.`;
    }

    // 2. 백엔드에 요청
    const response = await fetch(`${BACKEND_URL}/api/string/`, {
      method: 'GET',
      headers: fetchHeaders,
    });

    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;

    if (!response.ok) {
      const errorText = await response.text();
      logMessage += `\n  -> BACKEND ERROR BODY: ${errorText}`;
      throw new Error(`Backend responded with status ${response.status}`);
    }

    // 3. 성공 로그 및 반환
    const data = await response.json();
    logMessage += `\n  -> SUCCESS: Fetched coordinate data.`;
    await logToFile(logMessage);
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // 4. 실패 로그 및 반환
    const errorMessage = logMessage + `\n  -> PROXY ERROR: ${error.message}`;
    console.error(`[/api/string/coordinates] API Proxy Error:`, error);
    await logToFile(errorMessage);
    
    return new NextResponse(JSON.stringify({ message: '좌표값 요청 프록시 오류' }), {
      status: 500,
    });
  }
}