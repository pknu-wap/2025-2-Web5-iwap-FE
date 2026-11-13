export type FourierCoefficient = {
  amp: number;
  freq: number;
  phase: number;
};

export type SketchPoint = { x: number; y: number };

/** Fourier 변환 전 원본 스트로크 (미리보기/전송용 스냅샷) */
export type SketchSnapshot = {
  points: SketchPoint[];
  pathColor: string;
  pathAlpha: number;
  pathWidth: number;
  startDelay: number;
};

export type SketchStyles = {
  backgroundColor: string;
  epicycleColor: string;
  epicycleAlpha: number;
  showEpicycles: boolean;
  pathColor: string;
  pathAlpha: number;
  pathWidth: number;
};

export type EpicycleVisibility = Pick<SketchStyles, "showEpicycles" | "epicycleAlpha">;

/**
 * 엽서 제작 단계
 * front-draw → front-fourier → back-write → back-fourier → preview
 */
export type Phase = "front-draw" | "front-fourier" | "back-write" | "back-fourier" | "preview";

export type TextAlign = "left" | "center" | "right";

/** 전송 시 봉투 애니메이션 단계 */
export type SendAnimStage = "idle" | "fadePreview" | "insert" | "closed";
