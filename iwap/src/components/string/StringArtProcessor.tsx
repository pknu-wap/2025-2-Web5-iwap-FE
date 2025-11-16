interface CoordinatesResponse {
  coordinates: number[];
}

// API가 요구하는 파라미터 타입을 정의
export interface StringArtParams {
  radius: number;
  limit: number;
  rgb: boolean;
  wb: boolean;
  nail_step: number;
  strength: number;
}

export const processImageToStringArt = async (
  imageFile: File,
  params: StringArtParams 
): Promise<{ coordinates: number[]; colorImageUrl: string }> => {
  
  const formData = new FormData();
  
  // API 문서에 명시된 'file' 필드 이름으로 변경
  formData.append("file", imageFile); 
  
  // 나머지 파라미터를 FormData에 추가
  formData.append("radius", String(params.radius));
  formData.append("limit", String(params.limit));
  formData.append("rgb", String(params.rgb));
  formData.append("wb", String(params.wb));
  formData.append("nail_step", String(params.nail_step));
  formData.append("strength", String(params.strength));

  try {
    // 1. POST 요청으로 처리 시작
    const postRes = await fetch("/api/string", {
      method: "POST",
      body: formData,
    });

    // 422 (Validation Error) 등 응답 실패 시 상세 메시지 파싱
    if (!postRes.ok) {
      const errorText = await postRes.text();
      let detailedMessage = `API Error (Status: ${postRes.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail && Array.isArray(errorJson.detail) && errorJson.detail.length > 0) {
          const firstError = errorJson.detail[0];
          const loc = firstError.loc ? firstError.loc.join(' > ') : 'N/A';
          const msg = firstError.msg || 'Unknown validation error';
          detailedMessage = `Validation Error: ${msg} (at: ${loc})`;
        } else if (errorJson.detail) {
          detailedMessage = `Error: ${errorJson.detail}`;
        } else if (errorJson.message) {
          detailedMessage = `Error: ${errorJson.message}`;
        } else {
          detailedMessage = `Unknown JSON Error: ${errorText}`;
        }
      } catch (parseError) {
        detailedMessage = `Non-JSON Error (Status: ${postRes.status}): ${errorText.substring(0, 200)}...`;
      }
      
      console.error("[StringArtProcessor] Detailed Backend Error:", detailedMessage, {rawResponse: errorText});
      throw new Error(detailedMessage);
    }

    // 2. POST 성공 시, 좌표와 이미지를 병렬로 GET 요청
    const [coordRes, imageRes] = await Promise.all([
      fetch("/api/string/coordinates"),
      fetch("/api/string/image")
    ]);

    // 3. 좌표값 응답 처리
    if (!coordRes.ok) {
      throw new Error(`Failed to fetch coordinates. (Status: ${coordRes.status})`);
    }
    const coordData: CoordinatesResponse = await coordRes.json();
    if (!coordData.coordinates || coordData.coordinates.length === 0) {
      throw new Error("Server did not return valid coordinate data.");
    }

    // 4. 이미지 응답 처리
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch color image. (Status: ${imageRes.status})`);
    }
    const imageBlob = await imageRes.blob();
    const colorImageUrl = URL.createObjectURL(imageBlob);

    // 5. 결과 반환
    return { coordinates: coordData.coordinates, colorImageUrl };

  } catch (err) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error("An unknown error occurred during the API request.");
    }
  }
};