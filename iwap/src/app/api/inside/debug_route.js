/**
 * @file /api/inside 경로의 요청을 백엔드로 전달하는 API 프록시 (디버그용).
 * - 프록시 활동 로그, 모델 입력 이미지, 모델 출력 JSON을 각각 파일로 저장합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_API_URL;

// --- 헬퍼 함수: 디렉터리 및 파일 관리 ---

async function ensureDirectoriesExist(dirs) {
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`[route.js] Failed to create directory ${dir}:`, error);
    }
  }
}

async function logToFile(message) {
  const logDir = path.join(process.cwd(), 'logs');
  await ensureDirectoriesExist([logDir]);
  const logFile = path.join(logDir, 'api_proxy.log');
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

// --- 커스텀 JSON 포매터 ---
function customJsonStringify(obj) {
  const isArrayOfPrimitives = (arr) => arr.every(item => typeof item !== 'object' || item === null);

  function format(currentObj, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    const nextIndent = '  '.repeat(indentLevel + 1);

    if (currentObj === null) return 'null';
    if (typeof currentObj !== 'object') {
      return JSON.stringify(currentObj);
    }

    if (Array.isArray(currentObj)) {
      if (currentObj.length === 0) return '[]';
      if (isArrayOfPrimitives(currentObj)) {
        return `[ ${currentObj.map(JSON.stringify).join(', ')} ]`;
      }
      const items = currentObj.map(item => `${nextIndent}${format(item, indentLevel + 1)}`);
      return `[\n${items.join(',\n')}\n${indent}]`;
    }

    const keys = Object.keys(currentObj);
    if (keys.length === 0) return '{}';
    const items = keys.map(key => {
      const value = format(currentObj[key], indentLevel + 1);
      return `${nextIndent}"${key}": ${value}`;
    });
    return `{\n${items.join(',\n')}\n${indent}}`;
  }

  return format(obj, 0);
}

// --- API 라우트 핸들러 ---

export async function POST(request) {
  const url = request.nextUrl.pathname;
  let logMessage = `CLIENT REQUEST: POST, URL: ${url}`;

  try {
    const formData = await request.formData();
    const file = formData.get('num_image');

    // 1. 모델 입력(Input) 이미지 저장
    if (file && file instanceof File) {
      logMessage += `\n  - INPUT FILENAME: "${file.name}"\n  - TYPE: "${file.type}"\n  - SIZE: ${file.size} bytes`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      await saveDebugFile('input_images', fileName, fileBuffer);
    } else {
      logMessage += "\n  - No input file found in FormData.";
    }

    const response = await fetch(`${BACKEND_URL}/api/inside/`, {
      method: 'POST',
      body: formData,
    });
    
    const responseBody = await response.text();

    logMessage += `\n  -> BACKEND RESPONSE: ${response.status} ${response.statusText}`;
    if(responseBody) {
      logMessage += `\n  -> RESPONSE BODY (last 50 chars):\n...${responseBody.slice(-50)}`;
    }
    // 2. 프록시 활동 로그 저장
    await logToFile(logMessage);

    // 3. 모델 출력(Output) JSON 데이터 저장
    if (response.ok && responseBody) {
      try {
        const responseJson = JSON.parse(responseBody);
        const fileName = `${Date.now()}_output.json`;
        const formattedJsonString = customJsonStringify(responseJson);
        await saveDebugFile('output_json', fileName, formattedJsonString);

      } catch (e) {
        const fileName = `${Date.now()}_output_error.txt`;
        const errorContent = `JSON 파싱 실패:\n${e.message}\n\n원본 응답:\n${responseBody}`;
        await saveDebugFile('output_json', fileName, errorContent);
      }
    }

    return new NextResponse(responseBody, { 
        status: response.status,
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'text/plain' }
    });

  } catch (error) {
    const errorMessage = logMessage + `\n  -> PROXY ERROR: POST - ${error.message}`;
    console.error(`[route.js] API Proxy Error: ${error.message}`);
    await logToFile(errorMessage);
    return new NextResponse(JSON.stringify({ message: 'API 프록시 서버에서 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}