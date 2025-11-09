"use client";

import { useState, type ChangeEvent } from "react";

import { type Tool } from "../types";

type ToolControlsSectionProps = {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushColor: string;
  onBrushColorSelect: (color: string) => void;
  brushPalette: string[];
  customBrushHex: string;
  normalizedCustomBrushHex: string;
  onCustomBrushHexChange: (value: string) => void;
  onApplyCustomBrushHex: () => void;
  isCustomBrushHexValid: boolean;
  onBrushColorPicked: (event: ChangeEvent<HTMLInputElement>) => void;
  textColor: string;
  textPalette: string[];
  onTextColorSelect: (color: string) => void;
  customTextHex: string;
  normalizedTextHex: string;
  onTextHexChange: (value: string) => void;
  onApplyTextHex: () => void;
  isTextHexValid: boolean;
  onTextColorPicked: (event: ChangeEvent<HTMLInputElement>) => void;
  frontBackgroundColor: string;
  backgroundPalette: string[];
  onBackgroundColorSelect: (color: string) => void;
  backgroundHexInput: string;
  normalizedBackgroundHex: string;
  onBackgroundHexChange: (value: string) => void;
  onApplyBackgroundHex: () => void;
  isBackgroundHexValid: boolean;
  onBackgroundColorPicked: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetCanvas: () => void;
  onDownloadFront: () => void;
};

export function ToolControlsSection({
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  brushColor,
  onBrushColorSelect,
  brushPalette,
  customBrushHex,
  normalizedCustomBrushHex,
  onCustomBrushHexChange,
  onApplyCustomBrushHex,
  isCustomBrushHexValid,
  onBrushColorPicked,
  textColor,
  textPalette,
  onTextColorSelect,
  customTextHex,
  normalizedTextHex,
  onTextHexChange,
  onApplyTextHex,
  isTextHexValid,
  onTextColorPicked,
  frontBackgroundColor,
  backgroundPalette,
  onBackgroundColorSelect,
  backgroundHexInput,
  normalizedBackgroundHex,
  onBackgroundHexChange,
  onApplyBackgroundHex,
  isBackgroundHexValid,
  onBackgroundColorPicked,
  onResetCanvas,
  onDownloadFront,
}: ToolControlsSectionProps) {
  const [showBrushCustomizer, setShowBrushCustomizer] = useState(false);
  const [showBackgroundCustomizer, setShowBackgroundCustomizer] = useState(false);
  const [showTextCustomizer, setShowTextCustomizer] = useState(false);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">앞면 캔버스</h3>
        <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onToolChange("brush")}
            className={`rounded-full px-3 py-1.5 transition ${
              tool === "brush"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            브러시
          </button>
          <button
            type="button"
            onClick={() => onToolChange("eraser")}
            className={`rounded-full px-3 py-1.5 transition ${
              tool === "eraser"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            지우개
          </button>
          <button
            type="button"
            onClick={() => onToolChange("stroke-eraser")}
            className={`rounded-full px-3 py-1.5 transition ${
              tool === "stroke-eraser"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            획 지우개
          </button>
        </div>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>브러시 크기</span>
            <span>{brushSize}px</span>
          </div>
          <input
            type="range"
            min={2}
            max={28}
            step={1}
            value={brushSize}
            onChange={(event) => onBrushSizeChange(parseInt(event.target.value, 10))}
            className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-rose-100 accent-rose-400"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>브러시 컬러</span>
            <button
              type="button"
              onClick={() => setShowBrushCustomizer((previous) => !previous)}
              className="text-rose-500 transition hover:text-rose-400"
            >
              {showBrushCustomizer ? "닫기" : "색상 추가"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {brushPalette.map((color) => {
              const isActive = color === brushColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onBrushColorSelect(color)}
                  className={`h-9 w-9 rounded-full border transition ${
                    isActive
                      ? "border-slate-900 ring-2 ring-offset-2 ring-slate-900/70"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  style={{ background: color }}
                >
                  <span className="sr-only">{color}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowBrushCustomizer(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 text-lg text-slate-400 transition hover:border-rose-300 hover:text-rose-400"
            >
              +
            </button>
          </div>
          {showBrushCustomizer && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
              <input
                type="text"
                value={customBrushHex}
                onChange={(event) => onCustomBrushHexChange(event.target.value)}
                placeholder="#000000"
                className="min-w-[120px] flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <input
                type="color"
                value={normalizedCustomBrushHex || "#000000"}
                onChange={onBrushColorPicked}
                className="h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white"
                aria-label="브러시 색상 선택"
              />
              <button
                type="button"
                onClick={onApplyCustomBrushHex}
                disabled={!isCustomBrushHexValid}
                className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                  isCustomBrushHexValid
                    ? "bg-rose-500 hover:bg-rose-500/90"
                    : "bg-slate-300 text-slate-500"
                }`}
              >
                확인
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Text color</span>
            <button
              type="button"
              onClick={() => setShowTextCustomizer((previous) => !previous)}
              className="text-rose-500 transition hover:text-rose-400"
            >
              {showTextCustomizer ? "닫기" : "직접 입력"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {textPalette.map((color) => {
              const isActive = color === textColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onTextColorSelect(color)}
                  className={`h-9 w-9 rounded-full border transition ${
                    isActive
                      ? "border-slate-900 ring-2 ring-offset-2 ring-slate-900/70"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  style={{ background: color }}
                >
                  <span className="sr-only">{color}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowTextCustomizer(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 text-lg text-slate-400 transition hover:border-rose-300 hover:text-rose-400"
            >
              +
            </button>
          </div>
          {showTextCustomizer && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
              <input
                type="text"
                value={customTextHex}
                onChange={(event) => onTextHexChange(event.target.value)}
                placeholder="#333333"
                className="min-w-[120px] flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <input
                type="color"
                value={normalizedTextHex || "#333333"}
                onChange={onTextColorPicked}
                className="h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white"
                aria-label="텍스트 색상 선택"
              />
              <button
                type="button"
                onClick={onApplyTextHex}
                disabled={!isTextHexValid}
                className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                  isTextHexValid
                    ? "bg-rose-500 hover:bg-rose-500/90"
                    : "bg-slate-300 text-slate-500"
                }`}
              >
                적용
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>배경 컬러</span>
            <button
              type="button"
              onClick={() => setShowBackgroundCustomizer((previous) => !previous)}
              className="text-rose-500 transition hover:text-rose-400"
            >
              {showBackgroundCustomizer ? "닫기" : "색상 추가"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {backgroundPalette.map((color) => {
              const isActive = color === frontBackgroundColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onBackgroundColorSelect(color)}
                  className={`h-9 w-9 rounded-full border transition ${
                    isActive
                      ? "border-slate-900 ring-2 ring-offset-2 ring-slate-900/70"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  style={{ background: color }}
                >
                  <span className="sr-only">{color}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowBackgroundCustomizer(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 text-lg text-slate-400 transition hover:border-rose-300 hover:text-rose-400"
            >
              +
            </button>
          </div>
          {showBackgroundCustomizer && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
              <input
                type="text"
                value={backgroundHexInput}
                onChange={(event) => onBackgroundHexChange(event.target.value)}
                placeholder="#FFFFFF"
                className="min-w-[120px] flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <input
                type="color"
                value={normalizedBackgroundHex || "#ffffff"}
                onChange={onBackgroundColorPicked}
                className="h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white"
                aria-label="배경 색상 선택"
              />
              <button
                type="button"
                onClick={onApplyBackgroundHex}
                disabled={!isBackgroundHexValid}
                className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                  isBackgroundHexValid
                    ? "bg-rose-500 hover:bg-rose-500/90"
                    : "bg-slate-300 text-slate-500"
                }`}
              >
                확인
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResetCanvas}
            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
          >
            캔버스 초기화
          </button>
          <button
            type="button"
            onClick={onDownloadFront}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-rose-500/90"
          >
            앞면 PNG 저장
          </button>
        </div>
      </div>
    </section>
  );
}
