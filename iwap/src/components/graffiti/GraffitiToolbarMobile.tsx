import React, { useEffect, useRef, useState } from "react";

type GraffitiToolbarMobileProps = {
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

export default function GraffitiToolbarMobile({
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
}: GraffitiToolbarMobileProps) {
  const [showPalette, setShowPalette] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const normalizedBrushColor = brushColor.toLowerCase();
  const isBrushColorCustom = customPatterns.some(
    (pattern) => pattern.toLowerCase() === normalizedBrushColor
  );

  const normalizedPendingColor = pendingCustomColor?.toLowerCase();
  const isPendingDuplicate =
    Boolean(normalizedPendingColor) &&
    customPatterns.some(
      (pattern) => pattern.toLowerCase() === normalizedPendingColor
    );
  const confirmDisabled = !pendingCustomColor || isPendingDuplicate;
  const showDeleteAction = !pendingCustomColor && isBrushColorCustom;

  const sliderMin = 2;
  const sliderMax = 40;
  const sliderRange = sliderMax - sliderMin;
  const calculatedPercentage =
    sliderRange === 0 ? 0 : ((brushSize - sliderMin) / sliderRange) * 100;
  const sliderPercentage = Math.min(Math.max(calculatedPercentage, 0), 100);

  useEffect(() => {
    if (!showPalette) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setShowPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPalette]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="
          w-[350px] h-[56px]
          flex-shrink-0
          rounded-[118px]
          border border-white
          bg-[rgba(255,255,255,0.40)]
          shadow-[0_0_50px_0_rgba(0,0,0,0.25)]
          backdrop-blur-[4px]
          px-4
          flex items-center justify-between
        "
      >
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onUndo}
            aria-label="Undo"
            className="p-2"
            type="button"
          >
            <img
              src="/icons/redo_white.svg"
              className="w-[36px] h-[36px]  -scale-x-100 translate-y-0.5"
              alt="undo"
            />
          </button>
          <button
            onClick={onRedo}
            aria-label="Redo"
            className="p-2"
            type="button"
          >
            <img
              src="/icons/redo_white.svg"
              className="w-[36px] h-[36px] -translate-x-1 translate-y-0.5"
              alt="redo"
            />
          </button>
          <button
            onClick={onSave}
            aria-label="Save"
            className="
              hover:opacity-80 transition
              h-[50px] w-[50px]
              rounded-full border border-white/60 bg-white
              flex items-center justify-center
            "
            type="button"
          >
            <img
              src="/icons/download_b.svg"
              className="w-[32px] h-[32px]"
              alt="save"
            />
          </button>
          <button
            onClick={onClear}
            aria-label="Clear"
            className="p-2 hover:opacity-80 transition"
            type="button"
          >
            <img
              src="/icons/trash_white.svg"
              className="w-[30px] h-[30px]"
              alt="clear"
            />
          </button>
          <button
            type="button"
            onClick={() => setShowPalette((prev) => !prev)}
            aria-label="Brush options"
            className="
              h-[36px] w-[36px]
              rounded-full
            "
            style={{ backgroundImage: "url('/icons/rainbow.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat", }}
          />
        </div>
      </div>

      {showPalette && (
        <div
          className="
            absolute left-1/2 top-[calc(100%+12px)] -translate-x-1/2 -translate-y-[220px]
            w-[330px]
            rounded-2xl border border-white rounded-br-none
            bg-[rgba(255,255,255,0.40)]
            shadow-[0_0_50px_0_rgba(0,0,0,0.25)]
            backdrop-blur-[4px]
            px-4 py-3
            space-y-3
            z-10
          "
        >
          <div className="flex flex-wrap items-center gap-3">
            {colorPalette.map((color) => {
              const normalizedColor = color.toLowerCase();
              const isSelected = normalizedBrushColor === normalizedColor;
              const isWhite = normalizedColor === "#ffffff";
              const checkColor = isWhite ? "#000000" : "#ffffff";
              return (
                <button
                  key={color}
                  type="button"
                  className="relative h-[32px] w-[32px] rounded-full border transition flex items-center justify-center"
                  style={{ backgroundColor: color, borderColor: "#ffffff" }}
                  onClick={() => onBrushColorChange(color)}
                >
                  {isSelected && (
                    <span
                      className="text-[18px] leading-none"
                      style={{ color: checkColor, textShadow: "0 0 4px rgba(0,0,0,0.6)" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}

            {customPatterns.map((hex) => {
              const normalizedColor = hex.toLowerCase();
              const isSelected = normalizedBrushColor === normalizedColor;
              const isWhite = normalizedColor === "#ffffff";
              const checkColor = isWhite ? "#000000" : "#ffffff";
              return (
                <button
                  key={hex}
                  type="button"
                  className="relative h-[32px] w-[32px] rounded-full border transition flex items-center justify-center"
                  style={{ backgroundColor: hex, borderColor: "#ffffff" }}
                  onClick={() => onBrushColorChange(hex)}
                >
                  {isSelected && (
                    <span
                      className="text-[18px] leading-none"
                      style={{ color: checkColor, textShadow: "0 0 4px rgba(0,0,0,0.6)" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
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
                h-[32px] w-[32px]
                rounded-full
              "
              style={{
                backgroundImage: "url('/icons/rainbow.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
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
                h-[32px] px-3
                rounded-full border border-white/30
                text-[12px] text-white transition
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              {showDeleteAction ? "Delete" : "Confirm"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[16px] text-white/90 font-light">size</p>
            <div className="relative h-[26px] flex-1">
              <div className="absolute inset-0 flex items-center">
                <div className="h-[4px] w-full rounded-full bg-white/20" />
              </div>
              <div
                className="absolute left-0 top-1/2 h-[4px] rounded-full bg-white"
                style={{
                  width: `${sliderPercentage}%`,
                  transform: "translateY(-50%)",
                }}
              />
              <div
                className="pointer-events-none absolute top-1/2 flex h-[14px] w-[4px] rounded-[2px] bg-white"
                style={{
                  left: `${sliderPercentage}%`,
                  transform: "translate(-50%, -50%)",
                }}
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
            <span className="text-[12px] text-white/70 w-10 text-right">
              {brushSize}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
