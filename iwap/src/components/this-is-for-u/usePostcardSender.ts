import { useState, type RefObject } from "react";
import { DEFAULT_STYLES } from "./constants";
import type { FourierSketchController } from "./fourier-sketch";
import {
  dataUrlToBlob,
  getCanvas,
  recordCanvas,
  validatePostcardFields,
  wait,
} from "./postcardUtils";
import type { SendAnimStage, SketchSnapshot } from "./types";

const SEND_API_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/postcards/send`;

/** 봉투 애니메이션 타임라인 (전송 버튼 클릭 기준, ms) */
const ANIM_INSERT_AT = 600;
const ANIM_CLOSED_AT = 2600;

const RECORD_DURATION_MS = 3000;
/** 비어 있는 webm 헤더보다 큰 값. 이보다 작으면 녹화 실패로 본다. */
const MIN_VIDEO_SIZE = 1024;

type Options = {
  frontContainerRef: RefObject<HTMLDivElement | null>;
  backContainerRef: RefObject<HTMLDivElement | null>;
  frontController: FourierSketchController | null;
  backController: FourierSketchController | null;
  epicycleAlpha: number;
  /** 파일 생성에 실패해 처음부터 다시 해야 할 때 호출 */
  onFailure: () => void;
};

export type SendInput = {
  recipientEmail: string;
  message: string;
  frontSketches: SketchSnapshot[];
  backSketches: SketchSnapshot[];
  frontPreviewPng: string | null;
  backPreviewPng: string | null;
};

const toFile = (blob: Blob, name: string) => new File([blob], name, { type: blob.type });

/**
 * 엽서 전송 흐름: 검증 → 봉투 애니메이션 → 앞/뒷면 PNG + webm 녹화 → 서버 전송
 */
export function usePostcardSender({
  frontContainerRef,
  backContainerRef,
  frontController,
  backController,
  epicycleAlpha,
  onFailure,
}: Options) {
  const [sendAnimStage, setSendAnimStage] = useState<SendAnimStage>("idle");
  const [isMailSending, setIsMailSending] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);

  const controllers = [frontController, backController];

  const recordBothSides = async (frontCanvas: HTMLCanvasElement, backCanvas: HTMLCanvasElement) => {
    // 녹화 영상에는 epicycle이 보이도록 강제
    const visibleEpicycles = {
      showEpicycles: true,
      epicycleAlpha: epicycleAlpha > 0 ? epicycleAlpha : DEFAULT_STYLES.epicycleAlpha,
    };
    controllers.forEach((c) => c?.updateStyles(visibleEpicycles));
    await wait(50); // 캔버스 리페인트 대기

    controllers.forEach((c) => c?.startPlayback());
    const videos = await Promise.all([
      recordCanvas(frontCanvas, RECORD_DURATION_MS),
      recordCanvas(backCanvas, RECORD_DURATION_MS),
    ]);
    controllers.forEach((c) => c?.stopPlayback());
    return videos;
  };

  const sendPostcard = async ({ recipientEmail, frontPreviewPng, backPreviewPng }: SendInput) => {
    const frontCanvas = getCanvas(frontContainerRef.current);
    const backCanvas = getCanvas(backContainerRef.current);
    if (!frontCanvas || !backCanvas) {
      alert("예상치 못한 오류가 발생했습니다: 캔버스를 찾을 수 없습니다.");
      return;
    }

    setIsMailSending(true);

    const frontPng = frontPreviewPng ? dataUrlToBlob(frontPreviewPng) : null;
    const backPng = backPreviewPng ? dataUrlToBlob(backPreviewPng) : null;
    const [frontVideo, backVideo] = await recordBothSides(frontCanvas, backCanvas);

    if (
      !frontPng?.size ||
      !backPng?.size ||
      frontVideo.size < MIN_VIDEO_SIZE ||
      backVideo.size < MIN_VIDEO_SIZE
    ) {
      alert("엽서 파일(이미지/비디오) 생성에 실패했거나 영상이 비어있습니다. 다시 시도해주세요.");
      setIsMailSending(false);
      setSendAnimStage("idle");
      onFailure();
      return;
    }

    const formData = new FormData();
    formData.append("recipient", recipientEmail);
    formData.append("frontCard", toFile(frontPng, "front.png"));
    formData.append("backCard", toFile(backPng, "back.png"));
    // FastAPI 서버가 webm을 그대로 받아 처리한다
    formData.append("frontVideo", toFile(frontVideo, "front.webm"));
    formData.append("backVideo", toFile(backVideo, "back.webm"));

    try {
      const res = await fetch(SEND_API_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("전송 실패: " + text);
        return;
      }
      alert("메일 전송 완료!");
      setLastSentTime(Date.now());
      setIsSent(true);
    } catch (err) {
      console.error(err);
      alert("메일 전송 중 오류");
    } finally {
      setIsMailSending(false);
    }
  };

  const startSend = (input: SendInput) => {
    if (!validatePostcardFields({ ...input, lastSentTime, isMailSending })) return;

    // 미리보기 패널 fade-out → 엽서가 봉투로 들어감 → 봉투 닫힘
    setSendAnimStage("fadePreview");
    setTimeout(() => setSendAnimStage("insert"), ANIM_INSERT_AT);
    setTimeout(() => setSendAnimStage("closed"), ANIM_CLOSED_AT);

    void sendPostcard(input);
  };

  const resetSent = () => setIsSent(false);

  return { sendAnimStage, isMailSending, isSent, startSend, resetSent };
}
