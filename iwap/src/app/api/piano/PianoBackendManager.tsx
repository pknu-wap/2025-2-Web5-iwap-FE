"use client";

import { useEffect } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

const DEBUG_PIANO = (() => {
  const v = (process.env.NEXT_PUBLIC_PIANO_DEBUG || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
})();

const logDebug = (...args: unknown[]) => {
  if (!DEBUG_PIANO) return;
  console.log("[PianoBackend]", ...args);
};

const SUSTAIN_CC = 64;
const SUSTAIN_THRESHOLD = 64;
const MIN_RELEASE_GUARD = 0.02;

type SustainInterval = {
  start: number;
  end: number;
};

const clampVelocity = (velocity?: number | null) => {
  if (typeof velocity !== "number" || Number.isNaN(velocity)) {
    return 0.8;
  }
  return Math.max(0, Math.min(1, velocity));
};

const buildSustainIntervals = (
  track: Midi["tracks"][number],
  fallbackEnd: number
): SustainInterval[] => {
  const sustainEvents = track.controlChanges?.[SUSTAIN_CC];
  if (!sustainEvents || sustainEvents.length === 0) {
    return [];
  }

  const sorted = [...sustainEvents].sort((a, b) => a.time - b.time);
  const intervals: SustainInterval[] = [];
  let currentStart: number | null = null;

  for (const event of sorted) {
    const isDown = (event.value ?? 0) >= SUSTAIN_THRESHOLD;
    if (isDown) {
      if (currentStart === null) {
        currentStart = event.time;
      }
      continue;
    }

    if (currentStart !== null) {
      const end = Math.max(event.time, currentStart);
      intervals.push({ start: currentStart, end });
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    intervals.push({ start: currentStart, end: Math.max(fallbackEnd, currentStart) });
  }

  return intervals;
};

const computeSustainRelease = (
  noteStart: number,
  naturalRelease: number,
  intervals: SustainInterval[],
  fallbackEnd: number
) => {
  let releaseTime = naturalRelease;
  for (const { start, end } of intervals) {
    const effectiveEnd = Math.max(end, start + MIN_RELEASE_GUARD);
    if (naturalRelease <= start) {
      continue;
    }
    if (noteStart >= effectiveEnd) {
      continue;
    }
    releaseTime = Math.max(releaseTime, effectiveEnd);
    return Math.min(releaseTime, fallbackEnd);
  }
  return Math.min(Math.max(releaseTime, noteStart + MIN_RELEASE_GUARD), fallbackEnd);
};

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
  audioFile: File | null;
  onMidiEvent: (event: { type: "on" | "off"; note: number; velocity?: number }) => void;
  onStatusChange?: (status: string) => void;
  onTransportReady?: (controls: MidiTransportControls) => void;
  onTransportReset?: () => void;
  onMidiReady?: (payload: { blob: Blob; filename: string }) => void;
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

const getBackendUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base || base.trim().length === 0) {
    return normalizedPath;
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}${normalizedPath}`;
};

const describeFetchError = (err: unknown) => {
  if (err instanceof TypeError) {
    return "서버와 통신할 수 없어요. 네트워크나 백엔드 주소를 확인해 주세요.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "알 수 없는 오류가 발생했어요.";
};

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
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  });

  sampler.set({
    attack: 0.002,
    decay: 0.25,
    sustain: 0.85,
    release: 1.4,
  });
  sampler.volume.value = -3;

  if (USE_FX) {
    const mobile = isMobileDevice();
    const filter = new Tone.Filter({
      type: "lowpass",
      frequency: mobile ? 9000 : 12000,
      rolloff: -24,
    });
    const reverb = new Tone.Reverb({
      decay: mobile ? 1.6 : 2.2,
      wet: mobile ? 0.05 : 0.08,
    });
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
  audioFile,
  onMidiEvent,
  onStatusChange,
  onTransportReady,
  onTransportReset,
  onMidiReady,
}: PianoBackendManagerProps) {
  useEffect(() => {
    if (!audioUrl) return;

    let isCancelled = false;
    let sampler: Tone.Sampler | null = null;
    const activeMidiNotes = new Set<number>();
    const scheduledReleaseEvents = new Map<number, number>();

    onStatusChange?.("");
    onTransportReset?.();

    const flushActiveNotes = (time?: number) => {
      if (activeMidiNotes.size === 0) return;
      activeMidiNotes.forEach((note) => {
        Tone.Draw.schedule(
          () => onMidiEvent({ type: "off", note }),
          time ?? Tone.now()
        );
      });
      activeMidiNotes.clear();
    };

    const disposeTransport = () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;
      sampler?.releaseAll();
      scheduledReleaseEvents.clear();
      flushActiveNotes();
    };

    const fetchAndPlayMidi = async () => {
      try {
        onStatusChange?.("MIDI 변환 중...");
        const midiRes = await fetch(getBackendUrl("/api/piano/midi"));
        if (!midiRes.ok) {
          throw new Error("MIDI 파일 다운로드에 실패했습니다.");
        }

        const midiArray = await midiRes.arrayBuffer();
        const midiBlob = new Blob([midiArray], { type: "audio/midi" });
        onMidiReady?.({
          blob: midiBlob,
          filename: `piano-${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}.mid`,
        });

        const midi = new Midi(midiArray);

        await Tone.start();
        Tone.getDestination().volume.value = -20;

        disposeTransport();
        sampler = await getOrCreateSampler();

        const baseDuration =
          midi.duration ||
          midi.tracks.reduce(
            (max, track) =>
              Math.max(
                max,
                ...track.notes.map((n) => n.time + n.duration)
              ),
            0
          );

        const fallbackEnd = baseDuration + 4;
        let maxReleaseTime = 0;

        midi.tracks.forEach((track, trackIndex) => {
          const sustainIntervals = buildSustainIntervals(track, fallbackEnd);

          track.notes.forEach((note, noteIndex) => {
            const midiNum = note.midi;
            const attack = note.time;
            const naturalRelease = note.time + Math.max(note.duration, MIN_RELEASE_GUARD);
            const releaseTime = computeSustainRelease(
              attack,
              naturalRelease,
              sustainIntervals,
              fallbackEnd
            );
            const safeRelease = Math.max(attack + MIN_RELEASE_GUARD, releaseTime);
            maxReleaseTime = Math.max(maxReleaseTime, safeRelease);
            const velocity = clampVelocity(note.velocity);

            if (DEBUG_PIANO && noteIndex < 12) {
              logDebug("scheduleNote", {
                trackIndex,
                midi: midiNum,
                attack,
                naturalRelease,
                release: safeRelease,
                velocity,
                sustainIntervals: sustainIntervals.length,
              });
            }

            Tone.Transport.schedule((time) => {
              if (isCancelled) return;

              const prevReleaseEvent = scheduledReleaseEvents.get(midiNum);
              if (prevReleaseEvent !== undefined) {
                Tone.Transport.clear(prevReleaseEvent);
                scheduledReleaseEvents.delete(midiNum);
                sampler?.triggerRelease(note.name, time);
                if (activeMidiNotes.delete(midiNum)) {
                  Tone.Draw.schedule(
                    () => onMidiEvent({ type: "off", note: midiNum }),
                    time
                  );
                }
              }

              sampler?.triggerAttack(note.name, time, velocity);
              activeMidiNotes.add(midiNum);
              Tone.Draw.schedule(
                () => onMidiEvent({ type: "on", note: midiNum, velocity }),
                time
              );
            }, attack);

            const releaseEventId = Tone.Transport.schedule((time) => {
              if (isCancelled) return;
              sampler?.triggerRelease(note.name, time);
              if (activeMidiNotes.delete(midiNum)) {
                Tone.Draw.schedule(
                  () => onMidiEvent({ type: "off", note: midiNum }),
                  time
                );
              }
              scheduledReleaseEvents.delete(midiNum);
            }, safeRelease);

            scheduledReleaseEvents.set(midiNum, releaseEventId);
          });
        });

        const playbackDuration = Math.max(baseDuration, maxReleaseTime);

        const controls: MidiTransportControls = {
          duration: playbackDuration,
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
            const clamped = Math.max(0, Math.min(playbackDuration, seconds));
            Tone.Transport.seconds = clamped;
            if (resume) Tone.Transport.start();
          },
          getPosition: () =>
            Math.min(playbackDuration, Tone.Transport.seconds),
          getState: () =>
            Tone.Transport.state as "started" | "stopped" | "paused",
        };

        onStatusChange?.("");
        onTransportReady?.(controls);
      } catch (err) {
        console.error("MIDI 변환 실패:", err);
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

    const sendAudioToBackend = async () => {
      try {
        onStatusChange?.("MIDI 변환 중...");

        const formData = new FormData();
        if (audioFile) {
          formData.append("voice", audioFile, audioFile.name || "voice.webm");
        } else if (audioUrl) {
          const res = await fetch(audioUrl);
          const blob = await res.blob();
          const inferredName =
            (blob.type && `voice.${blob.type.split("/")[1]?.split(";")[0] || "webm"}`) ||
            "voice.webm";
          const fallbackFile = new File([blob], inferredName, {
            type: blob.type || "audio/webm",
          });
          formData.append("voice", fallbackFile, fallbackFile.name);
        } else {
          throw new Error("업로드할 음성 파일을 찾을 수 없습니다.");
        }

        const uploadRes = await fetch(getBackendUrl("/api/piano/"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(
            "오디오 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요."
          );
        }

        await fetchAndPlayMidi();
      } catch (err) {
        console.error("오디오 업로드 실패:", err);
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

    void sendAudioToBackend();

    return () => {
      isCancelled = true;
      disposeTransport();
      onTransportReset?.();
    };
  }, [
    audioUrl,
    audioFile,
    onMidiEvent,
    onStatusChange,
    onTransportReady,
    onTransportReset,
    onMidiReady,
  ]);

  return null;
}
963
