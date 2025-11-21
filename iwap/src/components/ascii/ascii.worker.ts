// src/workers/ascii.worker.ts

// --- Constants (워커는 독립된 스코프를 가지므로 필요한 상수를 가져와야 합니다) ---

// (세밀한 94단계 명암 - 표준 ASCII 전체)
const SAFE_ASCII_CHARS_FULL = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;

// --- Shared Types ---
type AsciiCell = { char: string; color: string };

// 워커는 DOM에 직접 접근할 수 없으므로 OffscreenCanvas를 사용합니다.
self.onmessage = async (e: MessageEvent<{ imageSrc: string; maxWidth: number }>) => {
  const { imageSrc, maxWidth } = e.data;

  try {
    // 1. fetch를 통해 이미지를 Blob으로 가져옵니다.
    const response = await fetch(imageSrc);
    if (!response.ok) {
      throw new Error('Failed to fetch image.');
    }
    const imageBlob = await response.blob();
    
    // 2. Blob으로부터 ImageBitmap을 생성합니다. (워커 환경에 최적화됨)
    const img = await createImageBitmap(imageBlob);

    // 3. OffscreenCanvas를 사용하여 이미지 데이터를 추출합니다.
    const charAspectRatio = CHAR_WIDTH_PX / CHAR_HEIGHT_PX;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const canvasWidth = Math.floor(img.width * scale);
    const canvasHeight = Math.floor((img.height * scale) / (1 / charAspectRatio));
    
    // OffscreenCanvas 생성
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get OffscreenCanvas context.');
    }

    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    const generatedData: AsciiCell[][] = [];

    // 4. 핵심 변환 로직 (기존과 동일)
    for (let y = 0; y < canvasHeight; y++) {
    const rowData: AsciiCell[] = [];
      for (let x = 0; x < canvasWidth; x++) {
        const i = (y * canvasWidth + x) * 4;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const gray = 0.21 * r + 0.72 * g + 0.07 * b;
        
        // [수정] SAFE_ASCII_CHARS_FULL을 사용하도록 변경
        const char = SAFE_ASCII_CHARS_FULL[Math.floor((gray / 255) * (SAFE_ASCII_CHARS_FULL.length - 1))] || ' ';
        
        const color = `rgb(${r},${g},${b})`;
        rowData.push({ char, color });
      }
      generatedData.push(rowData);
    }

    // 5. 처리된 데이터를 메인 스레드로 다시 보냅니다.
    self.postMessage({
      status: 'success',
      data: generatedData,
      dims: { w: canvasWidth, h: canvasHeight },
    });

  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred in the worker.',
    });
  }
};