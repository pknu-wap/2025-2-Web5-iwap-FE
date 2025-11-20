import React from "react";

type GraffitiToolbarProps = {
  colorPalette: string[];
  brushColor: string;
  brushSize: number;
  customPatterns: string[];
  pendingCustomColor: string | null;
  colorPickerRef: React.RefObject<HTMLInputElement | null>;
  onBrushColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onCustomColorPick: (color: string) => void;
  onConfirmCustomColor: () => void;
  onRemoveCustomColor: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
};

export default function GraffitiToolbar({
  colorPalette,
  brushColor,
  brushSize,
  customPatterns,
  pendingCustomColor,
  colorPickerRef,
  onBrushColorChange,
  onSizeChange,
  onCustomColorPick,
  onConfirmCustomColor,
  onRemoveCustomColor,
  onUndo,
  onRedo,
  onClear,
  onSave,
}: GraffitiToolbarProps) {
  const normalizedPendingColor = pendingCustomColor?.toLowerCase();
  const isPendingDuplicate =
    Boolean(normalizedPendingColor) &&
    customPatterns.some(
      (pattern) => pattern.toLowerCase() === normalizedPendingColor
    );

  const confirmDisabled = !pendingCustomColor || isPendingDuplicate;
  const normalizedBrushColor = brushColor.toLowerCase();
  const isBrushColorCustom = customPatterns.some(
    (pattern) => pattern.toLowerCase() === normalizedBrushColor
  );
  const showDeleteAction = !pendingCustomColor && isBrushColorCustom;
  const sliderMin = 2;
  const sliderMax = 40;
  const sliderRange = sliderMax - sliderMin;
  const calculatedPercentage =
    sliderRange === 0 ? 0 : ((brushSize - sliderMin) / sliderRange) * 100;
  const sliderPercentage = Math.min(Math.max(calculatedPercentage, 0), 100);

  return (
    <div
      className="
        w-[820px] h-[90px]
        flex-shrink-0
        rounded-[118px]
        border border-white
        bg-[rgba(255,255,255,0.40)]
        shadow-[0_0_50px_20px_rgba(0,0,0,0.25)]
        backdrop-blur-[4px]
        px-6
        flex items-center justify-between
      "
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          aria-label="Undo"
          className="p-2 hover:opacity-75 transition"
          type="button"
        >
          <img
            src="/icons/redo_white.svg"
            className="w-[28px] h-[28px] -scale-x-100"
          />
        </button>
        <button
          onClick={onRedo}
          aria-label="Redo"
          className="p-2 hover:opacity-75 transition"
          type="button"
        >
          <img
            src="/icons/redo_white.svg"
            className="w-[28px] h-[28px]"
          />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {colorPalette.map((color) => {
          const normalizedColor = color.toLowerCase();
          const isSelected = normalizedBrushColor === normalizedColor;
          const borderColor = isSelected
            ? normalizedColor === "#ffffff"
              ? "#000000"
              : "#ffffff"
            : "rgba(255,255,255,0.3)";
          return (
            <button
              key={color}
              type="button"
              className="
                h-[30px] w-[30px]
                rounded-full border-2
                transition
              "
              style={{
                backgroundColor: color,
                borderColor,
              }}
              onClick={() => onBrushColorChange(color)}
            />
          );
        })}

        {customPatterns.map((hex) => {
          const normalizedColor = hex.toLowerCase();
          const isSelected = normalizedBrushColor === normalizedColor;
          const borderColor = isSelected
            ? normalizedColor === "#ffffff"
              ? "#000000"
              : "#ffffff"
            : "rgba(255,255,255,0.3)";
          return (
            <button
              key={hex}
              type="button"
              className="h-[30px] w-[30px] rounded-full border-2 transition"
              style={{
                backgroundColor: hex,
                borderColor,
              }}
              onClick={() => onBrushColorChange(hex)}
            />
          );
        })}

        <input
          type="color"
          ref={colorPickerRef}
          className="hidden"
          onChange={(event) => onCustomColorPick(event.target.value)}
        />
        <button
          type="button"
          className="
            h-[30px] w-[30px]
            rounded-full border-2 transition
          "
          style={{
            borderColor: isBrushColorCustom
              ? "#ffffff"
              : "rgba(255,255,255,0.3)",
            background:
              "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
          }}
          onClick={() =>
            colorPickerRef.current?.showPicker?.() ??
            colorPickerRef.current?.click()
          }
        />
        <button
          type="button"
          onClick={
            showDeleteAction
              ? () => onRemoveCustomColor(brushColor)
              : onConfirmCustomColor
          }
          disabled={showDeleteAction ? false : confirmDisabled}
          className="
            px-2 py-1
            rounded-full border border-white/30
            text-[12px]
            text-white transition
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {showDeleteAction ? "Delete" : "Confirm"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <p className="flex items-center text-[20px] text-white font-light">
          size
        </p>
        <div className="relative h-[32px] w-[150px]">
          <div className="absolute inset-0 flex items-center">
            <div className="h-[4px] w-full rounded-full bg-white/20" />
          </div>
          <div
            className="absolute left-0 top-1/2 h-[4px] rounded-full bg-white"
            style={{ width: `${sliderPercentage}%`, transform: "translateY(-50%)" }}
          />
          <div
            className="pointer-events-none absolute top-1/2 flex h-[15px] w-[4px] rounded-[2px] bg-white"
            style={{ left: `${sliderPercentage}%`, transform: "translate(-50%, -50%)" }}
          />
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={brushSize}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          aria-label="Clear"
          className="p-2 hover:opacity-75 transition"
          type="button"
        >
          <img
            src="/icons/trash 2.svg"
            className="w-[24px] h-[24px]"
          />
        </button>
        <button
          onClick={onSave}
          className="
            w-[90px] h-[35px]
            rounded-[3px] text-[#294393] text-[20px] font-semibold
            bg-white hover:bg-[#294393]
            flex items-center justify-center gap-1
            transition-all
            group
          "
          type="button"
        >
          <img
            src="/icons/Download_blue.svg"
            alt="download"
            className="w-[18px] h-[18px] block group-hover:hidden"
          />
          <img
            src="/icons/download.svg"
            alt="download hover"
            className="w-[18px] h-[18px] hidden group-hover:block"
          />
          <span className="group-hover:text-white">PNG</span>
        </button>
      </div>
    </div>
  );
}
