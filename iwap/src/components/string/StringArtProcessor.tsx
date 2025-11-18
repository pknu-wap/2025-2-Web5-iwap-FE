interface StringTaskResponse {
  task_id: string;
}

interface CoordinatesResponse {
  pull_orders: number[][];
  nail_count: number;
}

// Helper function to poll an endpoint until it returns a 200 OK response
const pollEndpoint = async (
  url: string,
  interval: number = 2000, // 2-second interval
  maxAttempts: number = 90  // 90 attempts * 2s = 3 minutes timeout
): Promise<Response> => {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url);

    if (response.status === 200) {
      return response; // Success, return the response object
    }

    if (response.status !== 202) {
      // If it's not "Pending" or "Success", it's an unrecoverable error
      const errorText = await response.text();
      throw new Error(`Failed to fetch data. Status: ${response.status}, Body: ${errorText}`);
    }

    // If status is 202, wait for the interval before the next attempt
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error("Processing timed out. The task took too long.");
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
          detailedMessage = `Unknown JSON Error: ${errorText}`;
        }
      } catch (e) {
        detailedMessage = `Non-JSON Error (Status: ${postRes.status}): ${errorText.substring(0, 200)}...`;
      }
      
      console.error("[StringArtProcessor] Detailed Backend Error:", detailedMessage, {rawResponse: errorText});
      throw new Error(detailedMessage);
    }

    const postData: StringTaskResponse = await postRes.json();
    const { task_id } = postData;

    if (!task_id) {
      throw new Error("API did not return a task_id.");
    }

    // 2. task_id로 좌표와 이미지를 병렬로 폴링
    const [coordRes, imageRes] = await Promise.all([
      pollEndpoint(`/api/string/array/${task_id}`),
      pollEndpoint(`/api/string/image/${task_id}`)
    ]);

    // 3. 좌표값 응답 처리
    if (!coordRes.ok) { // Should not happen due to pollEndpoint logic, but for safety
      throw new Error(`Failed to fetch coordinates. (Status: ${coordRes.status})`);
    }
    const coordData: CoordinatesResponse = await coordRes.json();
    if (!coordData.pull_orders || coordData.pull_orders.length === 0 || coordData.pull_orders[0].length === 0) {
      throw new Error("Server did not return valid coordinate data (pull_orders is missing or empty).");
    }

    // 4. 이미지 응답 처리
    if (!imageRes.ok) { // Safety check
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
      throw new Error("An unknown error occurred during the API request.");
    }
  }
};