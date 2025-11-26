import React, { useCallback, useEffect, useRef, useState } from "react";
import { ERASER_TOKEN } from "./GraffitiToolbar";

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
  rotate?: boolean;
  desktopDevMobile?: boolean;
  onSaveWithVideo: () => void;
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
  rotate = false,
  desktopDevMobile = false,
  onSaveWithVideo,
}: GraffitiToolbarMobileProps) {
  const [showPalette, setShowPalette] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const saveMenuRef = useRef<HTMLDivElement | null>(null);

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
  const [fallbackHex, setFallbackHex] = useState<string>("#ffffff");

  const sliderMin = 2;
  const sliderMax = 40;
  const sliderRange = sliderMax - sliderMin;
  const calculatedPercentage =
    sliderRange === 0 ? 0 : ((brushSize - sliderMin) / sliderRange) * 100;
  const sliderPercentage = Math.min(Math.max(calculatedPercentage, 0), 100);
  const isValidHex = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  const isEraserSelected = brushColor === ERASER_TOKEN;
  const stopPointerPropagation = useCallback((event: React.PointerEvent) => {
    event.stopPropagation();
  }, []);
  const stopAll = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);
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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) return;
      const target = event.target as Node;
      if ((target as HTMLElement)?.closest("[data-palette]")) return;
      if (!wrapperRef.current.contains(target)) {
        setShowPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showPalette]);

  useEffect(() => {
    if (pendingCustomColor && isValidHex(pendingCustomColor)) {
      setFallbackHex(pendingCustomColor);
    }
  }, [pendingCustomColor]);

  useEffect(() => {
    if (!showSaveMenu) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!saveMenuRef.current) return;
      if (!saveMenuRef.current.contains(event.target as Node)) {
        setShowSaveMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSaveMenu]);

  const rotateClass = rotate
    ? "-rotate-90 origin-center translate-x-[30px] -translate-y-[48px] z-[100] scale-[0.8]"
    : desktopDevMobile
      ? "translate-y-[110px]"
      : "-translate-y-[50px]";
  const iconRotate = rotate ? "rotate-90" : "";
  const palettePositionClass = rotate
    ? "fixed -translate-y-[310px] translate-x-[100px] z-[120]"
    : "fixed left-1/2 bottom-[80px] -translate-x-1/2 z-[100]";

  const undoButton = (
    <button
      onClick={onUndo}
      aria-label="Undo"
      className="p-2"
      type="button"
    >
      <img
        src="/icons/redo_white.svg"
        className={`w-[36px] h-[36px]  -scale-x-100 translate-y-0.5 ${iconRotate}`}
        alt="undo"
      />
    </button>
  );

  const rainbowButton = (
    <button
      type="button"
      onClick={() => setShowPalette((prev) => !prev)}
      aria-label="Brush options"
      className="
        h-[36px] w-[36px]
        rounded-full
      "
      style={{
        backgroundImage: "url('/icons/rainbow_color.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );

  return (
    <div className={`relative ${rotateClass}`} ref={wrapperRef}>
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
          {undoButton}
          <button
            onClick={onRedo}
            aria-label="Redo"
            className="p-2"
            type="button"
          >
            <img
              src="/icons/redo_white.svg"
              className={`w-[36px] h-[36px] -translate-x-1 translate-y-0.5 ${iconRotate}`}
              alt="redo"
            />
          </button>
          <div className="relative" ref={saveMenuRef}>
            <button
              onClick={() => setShowSaveMenu((prev) => !prev)}
              aria-label="Save options"
            className="
              hover:opacity-80 transition
              h-[50px] w-[50px]
              rounded-full border border-white/60 bg-white/90
              flex items-center justify-center -translate-x-[8px]
            "
            type="button"
          >
            <img
              src="/icons/download_black.svg"
              className={`w-[32px] h-[32px] ${iconRotate}`}
              alt="save options"
            />
          </button>
            {showSaveMenu && (
              <div
                className={`
                  absolute right-0 bottom-[70px]
                  flex items-center gap-2
                  overflow-hidden z-[150]
                  translate-x-[50px]
                  ${rotate ? "-translate-y-[5px] origin-top" : ""}
                `}
              >
                <button
                  type="button"
                  className="w-[80px] h-[40px] flex-shrink-0 rounded-[25px] rounded-br-none border border-white bg-white/40 text-[#ffffff] text-[20px] font-normal flex items-center justify-center hover:bg-[#294393] hover:text-white"
                  onClick={() => {
                    onSave();
                    setShowSaveMenu(false);
                  }}
                >
                  <span>Sketch</span>
                </button>
                <button
                  type="button"
                  className="w-[80px] h-[40px] flex-shrink-0 rounded-[25px] rounded-bl-none border border-white bg-white/40 text-[#ffffff] text-[20px] font-normal flex items-center justify-center hover:bg-[#294393] hover:text-white"
                  onClick={() => {
                    onSaveWithVideo();
                    setShowSaveMenu(false);
                  }}
                >
                  <span>Scene</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClear}
            aria-label="Clear"
            className="p-2 hover:opacity-80 transition"
            type="button"
          >
            <img
              src="/icons/trash_white.svg"
              className={`w-[30px] h-[30px] ${iconRotate}`}
              alt="clear"
            />
          </button>
          {rainbowButton}
        </div>
      </div>

      {showPalette && (
        <div
          data-palette="true"
          className={`
            ${palettePositionClass}
            ${rotate ? "rotate-90 origin-center" : ""}
            pointer-events-auto
            w-[330px]
            rounded-2xl border border-white ${rotate ? "rounded-tr-none" : "rounded-br-none"}
            bg-[rgba(255,255,255,0.40)]
            shadow-[0_0_50px_0_rgba(0,0,0,0.25)]
            backdrop-blur-[4px]
            px-4 py-3
            space-y-3
            z-[999]
            `}
          onPointerDown={stopPointerPropagation}
          onPointerMove={stopPointerPropagation}
          onPointerUp={stopPointerPropagation}
          onMouseDown={stopAll}
          onMouseUp={stopAll}
          onClick={stopAll}
          onTouchStart={stopAll}
          onTouchEnd={stopAll}
        >
          <div className="flex flex-col items-center justify-center gap-4 w-full pointer-events-auto">
            <div className="flex flex-wrap items-center justify-center gap-3 w-full pointer-events-auto">
              {colorPalette.map((color) => {
                const normalizedColor = color.toLowerCase();
                const isSelected = !isEraserSelected && normalizedBrushColor === normalizedColor;
                const isWhite = normalizedColor === "#ffffff";
                const checkColor = isWhite ? "#000000" : "#ffffff";
                return (
                  <button
                    key={color}
                    type="button"
                    className="relative h-[32px] w-[32px] rounded-full border transition flex items-center justify-center"
                    style={{ backgroundColor: color, borderColor: "#ffffff" }}
                    onClick={(e) => {
                      stopAll(e);
                      onBrushColorChange(color);
                    }}
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
                const isSelected = !isEraserSelected && normalizedBrushColor === normalizedColor;
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
                className="absolute left-1/2 top-1/2 h-[1px] w-[1px] -translate-x-1/2 -translate-y-1/2 opacity-0"
                onChange={(event) => onCustomColorPick(event.target.value)}
              />
              <button
                type="button"
                className="
                h-[32px] w-[32px]
                rounded-full
              "
                style={{
                  backgroundImage: "url('/icons/rainbow_color.svg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
                onClick={openColorPicker}
              />

                            <button
                type="button"
                aria-pressed={isEraserSelected}
                className={`h-[28px] flex items-center justify-center hover:opacity-75 transition`}
                onClick={() => onBrushColorChange(ERASER_TOKEN)}
              >
                <img
                  src="/icons/eraser_white.svg"
                  alt="eraser"
                  className="w-[32px] h-[32px]"
                />
              </button>
              
              <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-full border border-white">
                <span className="text-[12px] text-white">HEX</span>
                <input
                  type="text"
                  value={fallbackHex}
                  onChange={(e) => setFallbackHex(e.target.value)}
                  className="w-[78px] rounded px-2 py-1 text-[12px] text-black"
                  placeholder="#FFFFFF"
                  inputMode="text"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="h-[30px] px-2 rounded-full border border-white text-[12px] text-white disabled:opacity-40"
                  onClick={() => {
                    const trimmed = fallbackHex.trim();
                    if (!isValidHex(trimmed)) return;
                    onCustomColorPick(trimmed);
                    onConfirmCustomColor();
                  }}
                  disabled={!isValidHex(fallbackHex)}
                >
                  적용
                </button>
              </div>
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
                rounded-full border border-white
                text-[12px] text-white transition
                disabled:opacity disabled:cursor-not-allowed
              "
              >
                {showDeleteAction ? "Delete" : "Confirm"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 w-full pointer-events-auto">
              <p className="text-[16px] text-white font-light">size</p>
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
        </div>
      )}
    </div>
  );
}
