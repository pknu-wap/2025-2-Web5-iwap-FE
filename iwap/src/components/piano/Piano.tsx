"use client";
import PianoKey from "./PianoKey";
import { pianoLayout, PIANO_WIDTH, PIANO_HEIGHT } from "./PianoLayout";

export default function Piano({ activeNotes }: { activeNotes: Set<number> }) {
  const whites = pianoLayout.filter(k => k.type === "white");
  const blacks = pianoLayout.filter(k => k.type === "black");

  return (
    <div className="relative" style={{ width: `${PIANO_WIDTH}px`, height: `${PIANO_HEIGHT}px` }}>
      {/* 흰건반 */}
      {whites.map(({ midi, x, y }) => (
        <div key={`w-${midi}`} className="absolute" style={{ left: x, bottom: y, zIndex: 1 }}>
          <PianoKey midi={midi} active={activeNotes.has(midi)} type="white" />
        </div>
      ))}

      {/* 검은건반 */}
      {blacks.map(({ midi, x, y }) => (
        <div key={`b-${midi}`} className="absolute" style={{ left: x + 35, top: y-12, zIndex: 30 }}>
          <PianoKey midi={midi} active={activeNotes.has(midi)} type="black" />
        </div>
      ))}
    </div>
  );
}
