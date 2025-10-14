import PianoKey from "./PianoKey";

export default function Octave({ start }: { start: number }) {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <PianoKey key={i} midi={start + i} active={false} />
      ))}
    </>
  );
}
