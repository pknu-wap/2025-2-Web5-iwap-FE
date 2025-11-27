import React from "react";

type Props = {
  colors: string[];
  activeColor: string;
  onChange: (color: string) => void;
};

export function BackgroundPalette({ colors, activeColor, onChange }: Props) {
  return (
    <div className="hidden md:flex flex-col gap-[5px] translate-y-[160px]">
      {colors.map((color) => {
        const isActive = activeColor === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-[56px] h-[26px] border border-white transition ${isActive ? "opacity-70" : "opacity-100 hover:opacity-100"}`}
            style={{ backgroundColor: color }}
            aria-label={`Set background to ${color}`}
          />
        );
      })}
    </div>
  );
}

