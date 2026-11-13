import { SEND_COOLDOWN_MS } from "./constants";
import { textToContours, type TextContour } from "./textToContours";
import type { SketchPoint, SketchSnapshot } from "./types";

/* ===========================
   일반 유틸
   =========================== */

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const getCanvas = (container: HTMLElement | null) =>
  container?.querySelector("canvas") ?? null;

export function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const [header, base64] = dataUrl.split(",");
  if (!base64) return null;
  const mime = header.match(/:(.*?);/)?.[1];
  if (!mime) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** 캔버스를 durationMs 동안 녹화해 webm Blob으로 반환 (브라우저는 mp4 녹화 불가) */
export function recordCanvas(canvas: HTMLCanvasElement, durationMs: number): Promise<Blob> {
  const recorder = new MediaRecorder(canvas.captureStream(30), {
    mimeType: "video/webm;codecs=vp9",
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  });
}

/* ===========================
   전송 전 검증
   =========================== */

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type PostcardValidationInput = {
  recipientEmail: string;
  message: string;
  frontSketches: SketchSnapshot[];
  backSketches: SketchSnapshot[];
  lastSentTime: number | null;
  isMailSending: boolean;
};

/** 전송 가능 여부를 검사하고, 불가하면 alert로 사유를 알린다. */
export function validatePostcardFields({
  recipientEmail,
  message,
  frontSketches,
  backSketches,
  lastSentTime,
  isMailSending,
}: PostcardValidationInput): boolean {
  if (isMailSending) {
    alert("메일 전송이 이미 진행 중입니다.");
    return false;
  }

  if (lastSentTime && Date.now() - lastSentTime < SEND_COOLDOWN_MS) {
    const remaining = Math.ceil((SEND_COOLDOWN_MS - (Date.now() - lastSentTime)) / 1000);
    alert(`메일을 다시 보내려면 ${remaining}초 더 기다려주세요.`);
    return false;
  }

  const hasMessage = message.trim().length > 0;
  const errors: string[] = [];
  if (!isValidEmail(recipientEmail)) errors.push("올바른 수신자 이메일이 필요합니다.");
  if (!hasMessage) errors.push("메시지를 입력해야 합니다.");
  if (frontSketches.length === 0) errors.push("엽서 앞면을 변환해주세요.");
  if (backSketches.length === 0) {
    errors.push(
      hasMessage ? "뒷면 메시지를 변환해주세요 (변환 시작 버튼 클릭)." : "엽서 뒷면을 변환해주세요.",
    );
  }

  if (errors.length > 0) {
    alert(`다음 문제를 해결해주세요:\n- ${errors.join("\n- ")}`);
    return false;
  }
  return true;
}

/* ===========================
   뒷면 메시지 → 스트로크 레이아웃
   =========================== */

const MESSAGE_CHUNK_PATTERN = /.{1,5}/g; // 5글자씩 한 줄
const MESSAGE_MAX_LINES = 2;
const MESSAGE_LINE_HEIGHT = 120; // 원본 좌표계 기준
const CONTOUR_BOX = { boxWidth: 400, boxHeight: 450 };

function getBounds(contours: TextContour[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  contours.forEach((contour) =>
    contour.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
    }),
  );
  return { minX, maxX, minY };
}

/**
 * 메시지를 5글자씩 최대 2줄로 나눠 글자 외곽선 좌표로 변환한다.
 * 각 줄은 Fourier 캔버스 중심(0, 0) 기준으로 가운데 정렬된다.
 */
export async function layoutMessageStrokes(text: string, scale: number): Promise<SketchPoint[][]> {
  const chunks = text.match(MESSAGE_CHUNK_PATTERN) ?? [];

  const lines: TextContour[][] = [];
  for (const chunk of chunks) {
    if (lines.length >= MESSAGE_MAX_LINES) break;
    const contours = await textToContours(chunk, CONTOUR_BOX);
    if (contours.length) lines.push(contours);
  }

  const startY = -(lines.length - 1) * MESSAGE_LINE_HEIGHT * 0.5;

  return lines.flatMap((contours, row) => {
    const { minX, maxX, minY } = getBounds(contours);
    const offsetX = -((maxX - minX) || 1) / 2;
    const offsetY = startY + row * MESSAGE_LINE_HEIGHT;
    return contours.map((contour) =>
      contour.map((p) => ({
        x: (p.x - minX + offsetX) * scale,
        y: (p.y - minY + offsetY) * scale,
      })),
    );
  });
}
