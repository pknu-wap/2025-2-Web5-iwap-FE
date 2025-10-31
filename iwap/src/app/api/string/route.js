/**
 * @file /api/string 경로에 대한 테스트용 API 라우트.
 * - 실제 백엔드 통신 없이 로컬의 더미 JSON 파일을 응답합니다.
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    // public 폴더에 있는 더미 데이터 파일의 경로
    const filePath = path.join(process.cwd(), 'public', 'dummy_string_art.json');
    
    // 파일 읽기
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // 1-2초 지연을 시뮬레이션하여 로딩 인디케이터를 테스트
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1000));

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error(`[/api/string][DUMMY] Error reading dummy file:`, error);
    return new NextResponse(JSON.stringify({ message: '더미 데이터를 읽는 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}