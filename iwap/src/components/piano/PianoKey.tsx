import { isBlack } from "./utils";

export default function PianoKey({ midi, active }: { midi: number; active: boolean }) {
  const black = isBlack(midi);
  const baseWhite =
    "h-[16em] w-[4em] z-10 border-l border-b border-[#bbb] rounded-b-[5px] " +
    "shadow-[-1px_0_0_rgba(255,255,255,0.8)_inset,0_0_5px_#ccc_inset,0_0_3px_rgba(0,0,0,0.2)] " +
    "bg-gradient-to-b from-[#eee] to-white";
  const baseBlack =
    "black h-[8em] w-[2em] ml-[-1em] mr-[-1em] z-20 border border-black rounded-b-[3px] " +
    "bg-gradient-to-tr from-[#222] to-[#555]";
  return <li className={black ? baseBlack : baseWhite} />;
}
