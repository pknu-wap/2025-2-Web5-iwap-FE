import type { CSSProperties } from "react";
import type { EpicycleVisibility, SketchStyles } from "./types";

export const DEFAULT_STYLES: SketchStyles = {
  backgroundColor: "#FFFFFF",
  epicycleColor: "#50a0ff",
  epicycleAlpha: 2040,
  showEpicycles: true,
  pathColor: "#000000",
  pathAlpha: 255,
  pathWidth: 10,
};

export const HIDDEN_EPICYCLES: EpicycleVisibility = { showEpicycles: false, epicycleAlpha: 0 };

export const COLOR_PALETTE = ["#FA4051", "#FDD047", "#2FB665", "#FFFFFF", "#000000"];
export const BACKGROUND_COLORS = ["#FFFFFF", "#FFFEF0", "#FEF2F2", "#DBEAFE", "#0F172A", "#000000"];

/** 뒷면 메시지 최대 글자 수 (5글자 × 2줄) */
export const MESSAGE_MAX_LENGTH = 10;

export const MOBILE_BREAKPOINT = 768;

/** 뒷면 메시지를 Fourier 스트로크로 그릴 때의 배율/선 두께 */
export const MESSAGE_RENDER = {
  mobile: { scale: 0.33, pathWidth: 0.8 },
  desktop: { scale: 1, pathWidth: 1.2 },
} as const;

/** 같은 사람이 연속으로 메일을 보내지 못하도록 막는 대기 시간 */
export const SEND_COOLDOWN_MS = 30_000;

/** 반투명 유리 느낌의 패널 (메시지 작성 / 메일 입력) */
export const GLASS_PANEL_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.40)",
  border: "1px solid #FFF",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
};
