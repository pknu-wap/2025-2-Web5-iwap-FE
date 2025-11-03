"use client";

import { useEffect } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export type MidiTransportControls = {
  duration: number;
  start: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number, resume?: boolean) => void;
  getPosition: () => number;
  getState: () => "started" | "stopped" | "paused";
};

type PianoBackendManagerProps = {
  audioUrl: string | null;
  onMidiEvent: (event: { type: "on" | "off"; note: number }) => void;
  onStatusChange?: (status: string) => void;
  onTransportReady?: (controls: MidiTransportControls) => void;
  onTransportReset?: () => void;
};

let sharedSampler: Tone.Sampler | null = null;

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const USE_FX = (() => {
  const v = (process.env.NEXT_PUBLIC_PIANO_USE_FX || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
})();

const getOrCreateSampler = async () => {

  if (Tone.context.state !== "running") {
    await Tone.start();
  }

  if (sharedSampler) {
    await sharedSampler.loaded;
    return sharedSampler;
  }

  const sampler = new Tone.Sampler({
    urls: {
      A0: "A0.mp3",
      C1: "C1.mp3",
      "D#1": "Ds1.mp3",
      "F#1": "Fs1.mp3",
      A1: "A1.mp3",
      C2: "C2.mp3",
      "D#2": "Ds2.mp3",
      "F#2": "Fs2.mp3",
      A2: "A2.mp3",
      C3: "C3.mp3",
      "D#3": "Ds3.mp3",
      "F#3": "Fs3.mp3",
      A3: "A3.mp3",
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
      C6: "C6.mp3",
      "D#6": "Ds6.mp3",
      "F#6": "Fs6.mp3",
      A6: "A6.mp3",
      C7: "C7.mp3",
      "D#7": "Ds7.mp3",
      "F#7": "Fs7.mp3",
      A7: "A7.mp3",
      C8: "C8.mp3",
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  });
  
  if (USE_FX) {
    // Optional FX chain (can be disabled via env)
    const mobile = isMobileDevice();
    const filter = new Tone.Filter({
      type: "lowpass",
      frequency: mobile ? 9000 : 12000,
      rolloff: -24,
    });
    const reverb = new Tone.Reverb({ decay: mobile ? 1.6 : 2.2, wet: mobile ? 0.05 : 0.08 });
    sampler.chain(filter, reverb, Tone.Destination);
  } else {
    sampler.toDestination();
  }

  await sampler.loaded;
  sharedSampler = sampler;
  return sampler;
};

/**
 * Handles communication with the piano backend and schedules MIDI playback.
 */
export default function PianoBackendManager({
  audioUrl,
  onMidiEvent,
  onStatusChange,
  onTransportReady,
  onTransportReset,
}: PianoBackendManagerProps) {

  useEffect(() => {
  if (!audioUrl) return;

  let isCancelled = false;
  let sampler: Tone.Sampler | null = null;
  const activeMidiNotes = new Set<number>();
  onStatusChange?.(""); // 초기화
  onTransportReset?.();

  const flushActiveNotes = () => {
    if (!activeMidiNotes.size) return;
    activeMidiNotes.forEach((note) => onMidiEvent({ type: "off", note }));
    activeMidiNotes.clear();
  };

  const disposeTransport = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.seconds = 0;
    sampler?.releaseAll();
    flushActiveNotes();
  };

  const fetchAndPlayMidi = async () => {
    try {
      onStatusChange?.("MIDI 변환 중...");
      const midiRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/midi`
      );
      if (!midiRes.ok) throw new Error("MIDI 파일 다운로드 실패");

      const midiArray = await midiRes.arrayBuffer();
      const midi = new Midi(midiArray);

      await Tone.start();
      Tone.getDestination().volume.value = -20;

      disposeTransport();
      sampler = await getOrCreateSampler();

      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const midiNum = note.midi;
          const start = note.time;
          const duration = Math.max(note.duration, 0.05);

          Tone.Transport.schedule((time) => {
            if (isCancelled) return;
            sampler?.triggerAttackRelease(note.name, duration, time, note.velocity ?? 0.8);
            onMidiEvent({ type: "on", note: midiNum });
            Tone.Transport.scheduleOnce(() => {
              if (isCancelled) return;
              onMidiEvent({ type: "off", note: midiNum });
            }, start + duration);
          }, start);
        });
      });

      const duration =
        midi.duration ||
        midi.tracks.reduce((max, t) =>
          Math.max(max, ...t.notes.map((n) => n.time + n.duration)), 0);

      const controls: MidiTransportControls = {
        duration,
        start: async () => {
          if (isCancelled) return;
          await Tone.start();
          if (Tone.Transport.state !== "started") {
            Tone.Transport.start();
          }
        },
        pause: () => {
          Tone.Transport.pause();
          sampler?.releaseAll();
          flushActiveNotes();
        },
        stop: () => {
          Tone.Transport.stop();
          Tone.Transport.seconds = 0;
          sampler?.releaseAll();
          flushActiveNotes();
        },
        seek: (seconds: number, resume = false) => {
          const clamped = Math.max(0, Math.min(duration, seconds));
          Tone.Transport.seconds = clamped;
          if (resume) Tone.Transport.start();
        },
        getPosition: () => Tone.Transport.seconds,
        getState: () => Tone.Transport.state as "started" | "stopped" | "paused",
      };

      onStatusChange?.(""); // ✅ 완료 후 상태 문구 제거
      onTransportReady?.(controls);
    } catch (err) {
      console.error("MIDI 변환 실패:", err);
      if (!isCancelled) onStatusChange?.("MIDI 변환 중 오류가 발생했습니다.");
    }
  };

  const sendAudioToBackend = async () => {
    try {
      onStatusChange?.("MIDI 변환 중...");

      const res = await fetch(audioUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("voice", blob, "voice.webm");

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`,
        { method: "POST", body: formData }
      );

      if (!uploadRes.ok) throw new Error("오디오 업로드 실패");

      await fetchAndPlayMidi();
    } catch (err) {
      console.error("오디오 업로드 실패:", err);
      if (!isCancelled) onStatusChange?.("MIDI 변환 중 오류가 발생했습니다.");
    }
  };

  sendAudioToBackend();

  return () => {
    isCancelled = true;
    disposeTransport();
    onTransportReset?.();
  };
}, [audioUrl, onMidiEvent, onStatusChange, onTransportReady, onTransportReset]);


  return null;
}