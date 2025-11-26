interface StringTaskResponse {
  task_id: string;
}

interface CoordinatesResponse {
  pull_orders: number[][];
  nail_count: number;
}

// 엔드포인트가 200 OK 응답을 반환할 때까지 폴링하는 헬퍼 함수
const pollEndpoint = async (
  url: string,
  interval: number = 2000, // 2-second interval
  maxAttempts: number = 90  // 90 attempts * 2s = 3 minutes timeout
): Promise<Response> => {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url);

    if (response.status === 200) {
      return response; // 성공, 응답 객체 반환
    }

    if (response.status !== 202) {
      // "대기 중" 또는 "성공"이 아니면 복구 불가능한 에러입니다.
      const errorText = await response.text();
      throw new Error(`Failed to fetch data. Status: ${response.status}, Body: ${errorText}`);
    }

    // 상태가 202이면 다음 시도 전까지 대기합니다.
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error("처리 시간이 초과되었습니다. 작업이 너무 오래 걸립니다.");
};

export const processImageToStringArt = async (
  imageFile: File,
): Promise<{ coordinates: number[]; colorImageUrl: string; nailCount: number }> => {
  
  const formData = new FormData();
  formData.append("file", imageFile); 

  // 필수가 아닌 값들은 필드를 비워서 전송
  formData.append("random_nails", "");
  formData.append("limit", "");
  formData.append("nail_step", "");
  formData.append("radius", "");
  formData.append("rgb", "true");
  formData.append("wb", "");
  formData.append("strength", "");

  try {
    // 1. POST 요청으로 처리 시작, task_id 받기
    const postRes = await fetch("/api/string", {
      method: "POST",
      body: formData,
    });

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
          detailedMessage = `알 수 없는 JSON 오류: ${errorText}`;
        }
      } catch (e) {
        detailedMessage = `JSON이 아닌 오류 (상태: ${postRes.status}): ${errorText.substring(0, 200)}...`;
      }
      
      throw new Error(detailedMessage);
    }

    const postData: StringTaskResponse = await postRes.json();
    const { task_id } = postData;

    if (!task_id) {
      throw new Error("API에서 task_id를 반환하지 않았습니다.");
    }

    // 2. task_id로 좌표와 이미지를 병렬로 폴링
    const [coordRes, imageRes] = await Promise.all([
      pollEndpoint(`/api/string/array/${task_id}`),
      pollEndpoint(`/api/string/image/${task_id}`)
    ]);

    // 3. 좌표값 응답 처리
    if (!coordRes.ok) { // pollEndpoint 로직상 발생하지 않아야 하지만 안전을 위해 확인
      throw new Error(`Failed to fetch coordinates. (Status: ${coordRes.status})`);
    }
    const coordData: CoordinatesResponse = await coordRes.json();
    if (!coordData.pull_orders || coordData.pull_orders.length === 0 || coordData.pull_orders[0].length === 0) {
      throw new Error("서버에서 유효한 좌표 데이터를 반환하지 않았습니다 (pull_orders 누락 또는 비어 있음).");
    }

    // 4. 이미지 응답 처리
    if (!imageRes.ok) { // 안전 확인
      throw new Error(`Failed to fetch color image. (Status: ${imageRes.status})`);
    }
    const imageBlob = await imageRes.blob();
    const colorImageUrl = URL.createObjectURL(imageBlob);

    // 5. 결과 반환 (nail_count 포함)
    return { 
        coordinates: coordData.pull_orders[0], 
        colorImageUrl, 
        nailCount: coordData.nail_count 
    };

  } catch (err) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error("API 요청 중 알 수 없는 오류가 발생했습니다.");
    }
  }
};