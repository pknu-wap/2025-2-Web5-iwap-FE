import { BACKGROUND_COLORS } from "./constants";

type Variant = "mobile" | "desktop";

const VARIANTS: Record<Variant, { container: string; button: (active: boolean) => string }> = {
  // 캔버스 위 가로 배치
  mobile: {
    container: "flex flex-row justify-center gap-2.5 md:hidden",
    button: (active) =>
      `w-11 h-7 border border-white/30 transition ${active ? "ring-1 ring-white" : "hover:opacity-80"}`,
  },
  // 캔버스 오른쪽 세로 배치
  desktop: {
    container: "hidden md:flex flex-col gap-[5px] absolute translate-y-[97px] left-1/2 ml-80",
    button: (active) =>
      `w-[56px] h-[26px] border border-white transition ${active ? "opacity-70" : "opacity-100 hover:opacity-100"}`,
  },
};

type BackgroundColorPickerProps = {
  variant: Variant;
  value: string;
  onChange: (color: string) => void;
};

export function BackgroundColorPicker({ variant, value, onChange }: BackgroundColorPickerProps) {
  const { container, button } = VARIANTS[variant];

  return (
    <div className={container}>
      {BACKGROUND_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={button(value === color)}
          style={{ backgroundColor: color }}
          aria-label={`Set background to ${color}`}
        />
      ))}
    </div>
  );
}
