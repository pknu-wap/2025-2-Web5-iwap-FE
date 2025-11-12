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

export type ConversionContext = {
  requestId: string;
  midiFilename?: string;
  mp3Filename?: string;
};

export type MidiReadyPayload = ConversionContext & {
  blob: Blob;
  filename: string;
};

type ConversionResponsePayload = ConversionContext & {
  message?: string;
};

type PianoBackendManagerProps = {
  audioUrl: string | null;
  onMidiEvent: (event: { type: "on" | "off"; note: number }) => void;
  onStatusChange?: (status: string) => void;
  onTransportReady?: (
    controls: MidiTransportControls,
    context?: ConversionContext
  ) => void;
  onTransportReset?: () => void;
  onMidiReady?: (payload: MidiReadyPayload) => void;
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

export const getBackendUrl = (path: string) => {
  // Always prefer same-origin API route to avoid CORS and hide backend URL.
  // The Next.js API route will proxy to the real backend server.
  return path.startsWith("/") ? path : `/${path}`;
};

const parseConversionResponse = async (
  res: Response
): Promise<ConversionResponsePayload> => {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("서버 응답을 읽을 수 없습니다.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("올바르지 않은 응답입니다.");
  }

  const payload = data as Record<string, unknown>;
  const requestId = payload.requestId;

  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new Error("요청 ID를 받지 못했습니다.");
  }

  return {
    requestId,
    midiFilename:
      typeof payload.midiFilename === "string"
        ? (payload.midiFilename as string)
        : undefined,
    mp3Filename:
      typeof payload.mp3Filename === "string"
        ? (payload.mp3Filename as string)
        : undefined,
    message:
      typeof payload.message === "string" ? (payload.message as string) : undefined,
  };
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
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  });

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
    const MAX_POLY = isMobileDevice() ? 6 : 12;

    onStatusChange?.("");
    onTransportReset?.();

    const flushActiveNotes = () => {
      if (activeMidiNotes.size === 0) return;
      activeMidiNotes.forEach((note) =>
        onMidiEvent({ type: "off", note })
      );
      activeMidiNotes.clear();
    };

    const disposeTransport = () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;
      sampler?.releaseAll();
      flushActiveNotes();
    };

    const fetchAndPlayMidi = async (conversion: ConversionContext) => {
      try {
        onStatusChange?.("MIDI 蹂??以?..");
        const requestToken = encodeURIComponent(conversion.requestId);
        const midiRes = await fetch(
          getBackendUrl(`/api/piano/midi?request_id=${requestToken}`)
        );
        if (!midiRes.ok) {
          throw new Error("MIDI ?뚯씪 ?ㅼ슫濡쒕뱶???ㅽ뙣?덉뒿?덈떎.");
        }

        const midiArray = await midiRes.arrayBuffer();
        const downloadBaseName = new Date().toISOString().replace(/[:.]/g, "-");
        let downloadBlob: Blob = new Blob([midiArray], {
          type: "audio/midi",
        });
        let downloadFilename = conversion.midiFilename ?? `piano-${downloadBaseName}.mid`;

        try {
          const mp3Res = await fetch(
            getBackendUrl(`/api/piano/mp3?request_id=${requestToken}`)
          );
          if (!mp3Res.ok) {
            throw new Error("MP3 파일 다운로드에 실패했습니다.");
          }
          const mp3Array = await mp3Res.arrayBuffer();
          downloadBlob = new Blob([mp3Array], { type: "audio/mpeg" });
          downloadFilename =
            conversion.mp3Filename ?? `piano-${downloadBaseName}.mp3`;
        } catch (mp3Error) {
          console.warn(
            "MP3 蹂???뚯씪??媛?몄삤吏 紐삵빐 MIDI濡??泥댄빀?덈떎.",
            mp3Error
          );
        }

        onMidiReady?.({
          blob: downloadBlob,
          filename: downloadFilename,
          requestId: conversion.requestId,
          midiFilename: conversion.midiFilename,
          mp3Filename: conversion.mp3Filename,
        });

        const midi = new Midi(midiArray);

        await Tone.start();
        // Favor stability on mobile by increasing lookAhead slightly
        const ctx = Tone.getContext();
        ctx.lookAhead = isMobileDevice() ? 0.2 : 0.1;
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
              // Simple polyphony limiter
              if (activeMidiNotes.size >= MAX_POLY) {
                return;
              }
              sampler?.triggerAttackRelease(
                note.name,
                duration,
                time,
                note.velocity ?? 0.8
              );
              activeMidiNotes.add(midiNum);
              onMidiEvent({ type: "on", note: midiNum });
              Tone.Transport.scheduleOnce(() => {
                if (isCancelled) return;
                activeMidiNotes.delete(midiNum);
                onMidiEvent({ type: "off", note: midiNum });
              }, start + duration);
            }, start);
          });
        });

        const duration =
          midi.duration ||
          midi.tracks.reduce(
            (max, track) =>
              Math.max(
                max,
                ...track.notes.map((n) => n.time + n.duration)
              ),
            0
          );

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
          getState: () =>
            Tone.Transport.state as "started" | "stopped" | "paused",
        };

        onStatusChange?.("");
        onTransportReady?.(controls, conversion);
      } catch (err) {
        console.error("MIDI 蹂???ㅽ뙣:", err);
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

    const sendAudioToBackend = async () => {
      try {
        onStatusChange?.("MIDI 蹂??以?..");

        const res = await fetch(audioUrl);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append("voice", blob, "voice.webm");

        const uploadRes = await fetch(getBackendUrl("/api/piano"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(
            "?ㅻ뵒???낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"
          );
        }

        const conversion = await parseConversionResponse(uploadRes);
        if (conversion.message) {
          onStatusChange?.(conversion.message);
        }

        await fetchAndPlayMidi(conversion);
      } catch (err) {
        console.error("?ㅻ뵒???낅줈???ㅽ뙣:", err);
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
    onMidiEvent,
    onStatusChange,
    onTransportReady,
    onTransportReset,
    onMidiReady,
  ]);

  return null;
}
