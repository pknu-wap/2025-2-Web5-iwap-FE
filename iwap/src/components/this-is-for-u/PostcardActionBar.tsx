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

export type PostcardAction = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** 다음에 누를 버튼을 강조하는 pulse 효과 */
  pulse?: boolean;
  /** 비활성 사유 등을 알려주는 툴팁 */
  title?: string;
};

export type PostcardActionBarProps = {
  variant: Variant;
  actions: PostcardAction[];
};

/** 현재 단계에서 할 수 있는 동작만 보여주는 버튼 묶음 */
export function PostcardActionBar({ variant, actions }: PostcardActionBarProps) {
  const { container, border } = VARIANTS[variant];
  const base = `rounded-full border ${border} px-3 py-1.5 font-light text-white whitespace-nowrap transition`;

  return (
    <div className={container}>
      {actions.map(({ key, label, onClick, disabled, pulse, title }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={title}
          className={`${base} ${
            disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"
          } ${pulse && !disabled ? PULSE : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
