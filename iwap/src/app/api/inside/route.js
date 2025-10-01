/**
 * @file /api/inside 경로의 API 엔드포인트를 정의합니다.
 */
import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * GET 요청을 처리하여 3D 시각화에 필요한 행렬 데이터를 반환합니다.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'Full_Data.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // 'layers' 객체를 직접 반환합니다.
    return NextResponse.json(data.layers);

  } catch (error) {
    console.error('GET /api/inside/ - 데이터 처리 중 오류 발생:', error);
    return new NextResponse('서버에서 데이터를 가져오는 중 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}

/**
 * POST 요청을 처리하여 사용자가 그린 숫자 이미지를 수신합니다.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return new NextResponse('요청에 이미지 파일이 포함되어야 합니다.', { status: 400 });
    }

    console.log(`POST /api/inside/ - 파일 수신: ${imageFile.name}, 크기: ${imageFile.size} bytes`);
    
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('POST /api/inside/ - 데이터 처리 중 오류 발생:', error);
    return new NextResponse('데이터 처리 중 서버 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}