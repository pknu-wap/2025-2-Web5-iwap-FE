import React, { useCallback, useEffect, useRef, useState } from "react";

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
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const openColorPicker = useCallback(() => {
    const picker = colorPickerRef.current;
    if (!picker) return;
    if (typeof (picker as any).showPicker === "function") {
      (picker as any).showPicker();
    } else {
      picker.click();
    }
  }, [colorPickerRef]);

  useEffect(() => {
    if (!showPalette) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!paletteRef.current) return;
      if (!paletteRef.current.contains(event.target as Node)) {
        setShowPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPalette]);
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
            className="w-[36px] h-[36px] -scale-x-100"
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
            className="w-[36px] h-[36px] -translate-x-1"
          />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {colorPalette.map((color) => {
          const normalizedColor = color.toLowerCase();
          const isSelected = normalizedBrushColor === normalizedColor;
          const isWhite = normalizedColor === "#ffffff";
          const checkColor = isWhite ? "#000000" : "#ffffff";
          return (
            <button
              key={color}
              type="button"
              className="
                relative
                h-[30px] w-[30px]
                rounded-full border
                transition
                flex items-center justify-center
              "
              style={{
                backgroundColor: color,
                borderColor: "#ffffff",
              }}
              onClick={() => onBrushColorChange(color)}
            >
              {isSelected && (
                <span
                  className="text-[18px] leading-none"
                  style={{ color: checkColor }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}

        <div className="relative" ref={paletteRef}>
          <input
            type="color"
            ref={colorPickerRef}
            className="absolute left-1/2 top-1/2 h-[1px] w-[1px] -translate-x-1/2 -translate-y-1/2 opacity-0"
            onChange={(event) => onCustomColorPick(event.target.value)}
          />
          <button
            type="button"
            className="
              h-[30px] w-[30px]
              rounded-full translate-y-[4px]
            "
            style={{
              backgroundImage: "url('/icons/rainbow.svg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
            onClick={() => setShowPalette((prev) => !prev)}
            aria-label="Open custom colors"
          />

          {showPalette && (
            <div
              className="
                absolute -translate-y-[180px] translate-x-[20px]
                w-[330px]
                min-h-[100px]
                rounded-2xl rounded-bl-none border border-white
                bg-[rgba(255,255,255,0.40)]
                shadow-[0_0_50px_0_rgba(0,0,0,0.25)]
                backdrop-blur-[4px]
                px-4 py-3
                space-y-3
              z-10
              "
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openColorPicker}
                  className="
                    h-[26px] px-3
                    rounded-full border border-white/40
                    text-[12px] text-white
                    hover:bg-white/10 transition
                  "
                >
                  Pick
                </button>
                <button
                  type="button"
                  onClick={
                    showDeleteAction
                      ? () => onRemoveCustomColor(brushColor)
                      : onConfirmCustomColor
                  }
                  disabled={showDeleteAction ? false : confirmDisabled}
                  className="
                    h-[26px] px-3
                    rounded-full border border-white/40
                    text-[12px] text-white transition
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-white/10
                  "
                >
                  {showDeleteAction ? "Delete" : "Confirm"}
                {/* </button>
                <button
                  type="button"
                  className="
                    h-[26px] w-[26px]
                    rounded-full border border-white/40
                    flex items-center justify-center
                    text-[14px] text-white
                    hover:bg-white/10 transition
                  "
                  onClick={() => setShowPalette(false)}
                  aria-label="Close palette"
                >
                  × */}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {customPatterns.length === 0 && (
                  <span className="text-white/50 text-[12px]"></span>
                )}
                {customPatterns.map((hex) => {
                  const normalizedColor = hex.toLowerCase();
                  const isCustomSelected = normalizedBrushColor === normalizedColor;
                  const isWhite = normalizedColor === "#ffffff";
                  const checkColor = isWhite ? "#000000" : "#ffffff";
                  return (
                    <button
                      key={hex}
                      type="button"
                      className="relative h-[30px] w-[30px] rounded-full border transition flex items-center justify-center"
                      style={{
                        backgroundColor: hex,
                        borderColor: "#ffffff",
                      }}
                      onClick={() => onBrushColorChange(hex)}
                    >
                      {isCustomSelected && (
                        <span
                          className="text-[18px] leading-none"
                          style={{ color: checkColor }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>
          )}
        </div>
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
            src="/icons/trash_white.svg"
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
            src="/icons/download_b.svg"
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
