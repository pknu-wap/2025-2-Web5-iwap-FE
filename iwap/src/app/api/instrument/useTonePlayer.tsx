// src/app/piano/hooks/useTonePlayer.ts
"use client";
import * as Tone from "tone";

export default function useTonePlayer() {
  // 1️⃣ 백엔드 JSON을 Tone.js용으로 변환
  async function buildFromJson(data: any) {
    const master = new Tone.Volume(-8).toDestination();
    const bpm = data.bpm ?? 120;
    Tone.Transport.bpm.value = bpm;

    const tracks = data.tracks ?? [];
    for (const track of tracks) {
      const synth = new Tone.PolySynth(Tone.Synth).connect(master);
      const notes = track.notes ?? [];

      // Tone.Part를 이용해 모든 노트를 예약
      const part = new Tone.Part((time, n) => {
        synth.triggerAttackRelease(
          Tone.Frequency(n.midi, "midi").toFrequency(),
          n.duration,
          time,
          n.velocity ?? 0.9
        );
      }, notes.map((n: any) => [n.time, n]));

      part.start(0);
    }
  }

  // 2️⃣ 오디오 파일을 백엔드로 업로드 (음성→MIDI 변환 요청)
  async function uploadAudio(blob: Blob) {
    const form = new FormData();
    form.append("file", blob, "recording.webm");
    const res = await fetch("https://pukyong-iwap.duckdns.org/api/piano/", {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return { buildFromJson, uploadAudio };
}