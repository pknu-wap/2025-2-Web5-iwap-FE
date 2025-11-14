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
  onUndo,
  onRedo,
  onClear,
  onSave,
}: GraffitiToolbarProps) {
  const isPendingDuplicate =
    Boolean(pendingCustomColor) &&
    customPatterns.includes(pendingCustomColor as string);

  const confirmDisabled = !pendingCustomColor || isPendingDuplicate;

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
        {colorPalette.map((color) => (
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
              borderColor:
                brushColor === color ? "#ffffff" : "rgba(255,255,255,0.3)",
            }}
            onClick={() => onBrushColorChange(color)}
          />
        ))}

        {customPatterns.map((hex) => (
          <button
            key={hex}
            type="button"
            className="h-[30px] w-[30px] rounded-full border-2 transition"
            style={{
              backgroundColor: hex,
              borderColor:
                brushColor === hex ? "#ffffff" : "rgba(255,255,255,0.3)",
            }}
            onClick={() => onBrushColorChange(hex)}
          />
        ))}

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
            borderColor:
              customPatterns.includes(brushColor)
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
          onClick={onConfirmCustomColor}
          disabled={confirmDisabled}
          className="
            px-2 py-1
            rounded-full border border-white/30
            text-[12px]
            text-white transition
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          Confirm
        </button>
      </div>

      <div className="flex items-center gap-2 w-[170px] h-[4px]">
        <p className="flex items-center text-[20px] text-white font-light">
          size
        </p>
        <input
          type="range"
          min={2}
          max={40}
          value={brushSize}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="w-full accent-white"
        />
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
