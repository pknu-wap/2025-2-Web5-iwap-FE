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
    onStatusChange?.("");
    onTransportReset?.();

    const flushActiveNotes = () => {
      if (!activeMidiNotes.size) return;
      activeMidiNotes.forEach((note) => {
        onMidiEvent({ type: "off", note });
      });
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
        onStatusChange?.("Downloading generated MIDI...");
        const midiRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/midi`
        );
        if (!midiRes.ok) throw new Error("Failed to download MIDI file");

        const midiArray = await midiRes.arrayBuffer();
        const midi = new Midi(midiArray);

        await Tone.start();
        disposeTransport();
        sampler = await getOrCreateSampler();

        midi.tracks.forEach((track) => {
          track.notes.forEach((note) => {
            const midiNum = note.midi;
            const start = note.time;
            const duration = Math.max(note.duration, 0.05);

            Tone.Transport.schedule((time) => {
              if (isCancelled) return;
              const instrument = sampler;
              if (!instrument) return;
              // Slight velocity floor to avoid super-quiet artifacts
              const vel = Math.max(0.08, note.velocity ?? 0.8);
              instrument.triggerAttackRelease(note.name, duration, time, vel);
              onMidiEvent({ type: "on", note: midiNum });
              Tone.Transport.scheduleOnce(() => {
                if (isCancelled) return;
                onMidiEvent({ type: "off", note: midiNum });
              }, start + duration);
              activeMidiNotes.add(midiNum);
              Tone.Transport.scheduleOnce(() => {
                if (isCancelled) return;
                activeMidiNotes.delete(midiNum);
              }, start + duration);
            }, start);
          });
        });

        if (!isCancelled) {
          const duration =
            midi.duration ||
            midi.tracks.reduce((max, track) => {
              const trackMax = track.notes.reduce(
                (acc, n) => Math.max(acc, n.time + n.duration),
                0
              );
              return Math.max(max, trackMax);
            }, 0);

          const controls: MidiTransportControls = {
            duration,
            start: async () => {
              if (isCancelled) return;
              await Tone.start();
              if (Tone.Transport.state !== "started") {
                Tone.Transport.start();
                onStatusChange?.("Playing generated MIDI...");
              }
            },
            pause: () => {
              if (Tone.Transport.state !== "started") return;
              Tone.Transport.pause();
              sampler?.releaseAll();
              flushActiveNotes();
              onStatusChange?.("Playback paused");
            },
            stop: () => {
              Tone.Transport.stop();
              Tone.Transport.seconds = 0;
              sampler?.releaseAll();
              flushActiveNotes();
              onStatusChange?.("Playback stopped");
            },
            seek: (seconds: number, resume = false) => {
              const clamped = Math.max(0, Math.min(duration, seconds));
              const wasRunning = Tone.Transport.state === "started";
              if (wasRunning) {
                Tone.Transport.pause();
              }
              sampler?.releaseAll();
              flushActiveNotes();
              Tone.Transport.seconds = clamped;
              const shouldResume = resume || wasRunning;
              if (shouldResume) {
                Tone.Transport.start();
                onStatusChange?.("Playing generated MIDI...");
              } else if (wasRunning) {
                onStatusChange?.("Playback paused");
              }
            },
            getPosition: () => Tone.Transport.seconds,
            getState: () =>
              Tone.Transport.state as "started" | "stopped" | "paused",
          };

          onStatusChange?.("MIDI ready. Use the transport to listen.");
          onTransportReady?.(controls);
        }
      } catch (err) {
        console.error("MIDI playback failed:", err);
        if (!isCancelled) {
          onStatusChange?.("MIDI playback failed");
        }
      }
    };

    const sendAudioToBackend = async () => {
      try {
        onStatusChange?.("Uploading audio for MIDI conversion...");
        const res = await fetch(audioUrl);
        const originalBlob = await res.blob();

        // Normalize blob type to match backend allowed types
        const allowedTypes = new Set([
          "audio/mpeg",
          "audio/mp3",
          "audio/webm",
          "audio/wav",
        ]);
        const normalizedType = allowedTypes.has(originalBlob.type)
          ? originalBlob.type
          : // For blob: URLs from MediaRecorder, default to webm if unknown
            (audioUrl?.startsWith("blob:") ? "audio/webm" : "audio/mpeg");

        const uploadBlob =
          originalBlob.type === normalizedType
            ? originalBlob
            : new Blob([originalBlob], { type: normalizedType });

        const formData = new FormData();
        const mime = uploadBlob.type || "audio/mpeg";
        const ext =
          mime === "audio/webm"
            ? "webm"
            : mime === "audio/wav"
            ? "wav"
            : mime === "audio/mp3" || mime === "audio/mpeg"
            ? "mp3"
            : "mp3";
        formData.append("voice", uploadBlob, `voice.${ext}`);

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadRes.ok) {
          let detail = "";
          try {
            const ct = uploadRes.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const body = await uploadRes.json();
              detail = body?.detail ? String(body.detail) : JSON.stringify(body);
            } else {
              detail = await uploadRes.text();
            }
          } catch {}
          const message = detail ? `Audio upload failed: ${detail}` : "Audio upload failed";
          onStatusChange?.(message);
          throw new Error(message);
        }

        onStatusChange?.("Processing MIDI response...");
        await fetchAndPlayMidi();
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          onStatusChange?.("An error occurred");
        }
      }
    };

    sendAudioToBackend();

    return () => {
      isCancelled = true;
      disposeTransport();
      onTransportReset?.();
    };
  }, [
    audioUrl,
    onMidiEvent,
    onStatusChange,
    onTransportReady,
    onTransportReset,
  ]);

  return null;
}
