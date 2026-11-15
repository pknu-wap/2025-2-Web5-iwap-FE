type Variant = "canvas" | "form";

const VARIANTS: Record<Variant, { container: string; border: string }> = {
  // 캔버스 아래 (앞면 / 뒷면 Fourier)
  canvas: {
    container:
      "z-30 flex flex-nowrap items-center justify-center gap-3 text-[10px] md:text-[14px] text-slate-200 z-90 translate-y-[32px] md:translate-y-[42px]",
    border: "border-white/30",
  },
  // 뒷면 메시지 작성 카드 안
  form: {
    container:
      "z-30 flex flex-nowrap items-center justify-center gap-3 text-[10px] md:text-[14px] text-slate-200 z-[90] translate-y-[20px] md:translate-y-[42px]",
    border: "border-white",
  },
};

const PULSE = "animate-shadow-pulse";

export type PostcardActionBarProps = {
  variant: Variant;
  isPlaying: boolean;
  isBackside: boolean;
  editDisabled: boolean;
  /** 다음에 누를 버튼을 강조하는 pulse 효과 */
  pulse: { startStop?: boolean; toggleSide?: boolean; send?: boolean };
  onStartStop: () => void;
  onToggleSide: () => void;
  onEdit: () => void;
  onSend: () => void;
};

/** 변환 시작/정지 · 앞뒷면 전환 · 수정 · 엽서 전송하기 버튼 묶음 */
export function PostcardActionBar({
  variant,
  isPlaying,
  isBackside,
  editDisabled,
  pulse,
  onStartStop,
  onToggleSide,
  onEdit,
  onSend,
}: PostcardActionBarProps) {
  const { container, border } = VARIANTS[variant];
  const base = `rounded-full border ${border} px-3 py-1.5 font-light text-white`;

  return (
    <div className={container}>
      <button
        type="button"
        onClick={onStartStop}
        className={`${base} transition hover:border-white/60 ${pulse.startStop ? PULSE : ""}`}
      >
        {isPlaying ? "정지" : "변환 시작"}
      </button>

      <button
        type="button"
        onClick={onToggleSide}
        className={`${base} hover:border-white/60 ${pulse.toggleSide ? PULSE : ""}`}
      >
        {isBackside ? "앞면 전환" : "뒷면 전환"}
      </button>

      <button
        type="button"
        onClick={onEdit}
        disabled={editDisabled}
        className={`${base} ${editDisabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"}`}
      >
        수정
      </button>

      <button
        type="button"
        onClick={onSend}
        className={`${base} hover:border-white/60 ${pulse.send ? PULSE : ""}`}
      >
        엽서 전송하기
      </button>
    </div>
  );
}
