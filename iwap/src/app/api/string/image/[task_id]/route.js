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
  let logMessage = `CLIENT REQUEST: GET /api/string/image/${task_id}`;

  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL is not defined.');
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

    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;

    if (!response.ok) {
      const errorText = await response.text();
      let decodedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        decodedError = JSON.stringify(errorJson, null, 2);
      } catch (e) { /* no-op */ }
      logMessage += `\n  -> BACKEND ERROR BODY:\n${decodedError}`;
      await logToFile(logMessage);
      throw new Error(`Backend responded with status ${response.status}`);
    }
    
    const contentType = response.headers.get('Content-Type') || '';

    if (response.status === 200 && contentType.startsWith('image/')) {
        logMessage += `\n  -> SUCCESS: Fetched image blob for task ${task_id}. (Type: ${contentType})`;
        const imageBlob = await response.blob();
        
        const extension = contentType.split('/')[1] || 'png';
        const fileName = `${task_id}_image.${extension}`;
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        await saveDebugFile('output_images', fileName, imageBuffer);
        logMessage += `\n  - Saved image to ${fileName}`;
        await logToFile(logMessage);

        const finalBlob = new Blob([imageBuffer], { type: contentType });
        return new NextResponse(finalBlob, {
            status: 200,
            headers: { 'Content-Type': contentType },
        });
    }

    const unexpectedBody = await response.text();
    throw new Error(`Unexpected response from backend. Status: ${response.status}, Content-Type: ${contentType}, Body: ${unexpectedBody}`);

  } catch (error) {
    const errorMessage = `CLIENT REQUEST: GET /api/string/image/${task_id}\n  -> PROXY ERROR: ${error.message}`;
    console.error(`[/api/string/image/${task_id}] API Proxy Error:`, error);
    await logToFile(errorMessage);
    
    return new NextResponse(JSON.stringify({ message: '이미지 요청 프록시 오류' }), {
      status: 500,
    });
  }
}