"use client";

import PianoKey from "./PianoKey";
import { pianoLayout, PIANO_WIDTH, PIANO_HEIGHT } from "./PianoLayout";

export default function Piano({ activeNotes }: { activeNotes: Set<number> }) {
  const whites = pianoLayout.filter(k => k.type === "white");

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="relative overflow-visible mx-auto" // flex 제거
        style={{
          width: `${PIANO_WIDTH}px`,
          height: `${PIANO_HEIGHT}px`,
        }}
      >
        {whites.map(({ midi, x, y, type }) => (
          <div
            key={`w-${midi}`}
            className="absolute bottom-0 z-[1]"
            style={{
              left: `${x}px`,
              bottom: `${y}px`,
            }}
          >
            <PianoKey midi={midi} active={activeNotes.has(midi)} type={type} />
          </div>
        ))}
      </div>
    </div>
  );
}
