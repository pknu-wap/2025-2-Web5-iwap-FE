/**
 * @file /api/inside 경로의 API 엔드포인트를 정의합니다.
 * Next.js App Router의 Route Handlers를 사용하여 구현되었습니다.
 * - GET: 3D 시각화를 위한 행렬 데이터를 반환합니다.
 * - POST: 사용자가 그린 숫자 이미지를 수신합니다.
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * GET 요청을 처리하여 3D 시각화에 필요한 행렬 데이터를 반환합니다.
 * 클라이언트가 그림을 성공적으로 전송한 후, 그 결과를 시각화하기 위해 이 API를 호출합니다.
 * @returns {Promise<NextResponse>} 성공 시 JSON 데이터를, 실패 시 에러 응답을 반환합니다.
 */
export async function GET() {
  try {
    // 프로젝트 루트 디렉토리 내의 'data/layers.txt' 파일의 절대 경로를 생성합니다.
    const filePath = path.join(process.cwd(), 'data', 'layers.txt');
    
    // 파일을 UTF-8 인코딩으로 읽어옵니다.
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // 읽어온 텍스트 데이터를 JavaScript 객체로 파싱합니다.
    const data = JSON.parse(fileContents);
    
    // 파싱된 데이터를 JSON 형식으로 클라이언트에 응답합니다.
    return NextResponse.json(data);

  } catch (error) {
    // 파일 읽기 또는 JSON 파싱 중 에러 발생 시 서버 콘솔에 로그를 남깁니다.
    console.error('GET /api/inside/ - 데이터 처리 중 오류 발생:', error);
    
    // 클라이언트에게 500 (Internal Server Error) 상태 코드와 함께 에러 메시지를 반환합니다.
    return new NextResponse('서버에서 데이터를 가져오는 중 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}

/**
 * POST 요청을 처리하여 사용자가 그린 숫자 이미지를 수신합니다.
 * 데이터는 'multipart/form-data' 형식으로 전송됩니다.
 * @param {Request} request - 클라이언트로부터 받은 요청 객체입니다.
 * @returns {Promise<NextResponse>} 성공 시 204 No Content를, 실패 시 에러 응답을 반환합니다.
 */
export async function POST(request) {
  try {
    // 'multipart/form-data' 형식의 요청 본문을 파싱합니다.
    const formData = await request.formData();

    // 'image'라는 이름(key)으로 전송된 파일 데이터를 가져옵니다.
    const imageFile = formData.get('image');

    // 'image' 파일이 없는 경우, 400 (Bad Request) 에러를 반환합니다.
    if (!imageFile) {
      return new NextResponse('요청에 이미지 파일이 포함되어야 합니다.', { status: 400 });
    }

    // 개발 환경에서 수신된 파일의 정보를 확인하기 위해 콘솔에 로그를 출력합니다.
    console.log(`POST /api/inside/ - 파일 수신: ${imageFile.name}, 크기: ${imageFile.size} bytes`);

    // TODO: 수신된 이미지 파일을 처리하는 로직을 여기에 구현합니다.
    // (예: 파일 시스템에 저장, AI 모델로 전달하여 분석 등)
    
    // API 명세에 따라, 성공적으로 처리되었음을 알리는 204 No Content 응답을 반환합니다.
    // 이 응답은 본문(body)을 포함하지 않습니다.
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    // 데이터 처리 중 에러 발생 시 서버 콘솔에 로그를 남깁니다.
    console.error('POST /api/inside/ - 데이터 처리 중 오류 발생:', error);

    // 클라이언트에게 500 (Internal Server Error) 상태 코드와 함께 에러 메시지를 반환합니다.
    return new NextResponse('데이터 처리 중 서버 오류가 발생했습니다.', { 
      status: 500 
    });
  }
}
