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

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const getBackendUrl = (path: string) => {
  // Always prefer same-origin API route to avoid CORS and hide backend URL.
  // The Next.js API route will proxy to the real backend server.
  return path.startsWith("/") ? path : `/${path}`;
};

const describeFetchError = (err: unknown) => {
  if (err instanceof TypeError) {
    return "네트워크 연결이나 백엔드 주소를 확인해주세요.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "알 수 없는 오류가 발생했어요.";
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
      flushActiveNotes();
    };

    const fetchAndPlayMidi = async (conversion: ConversionContext) => {
      try {
        onStatusChange?.("MIDI 변환 중...");
        const requestToken = encodeURIComponent(conversion.requestId);
        const midiRes = await fetch(
          getBackendUrl(`/api/piano/midi?request_id=${requestToken}`)
        );
        if (!midiRes.ok) {
          throw new Error("MIDI 파일 다운로드에 실패했습니다.");
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
            "MP3 변환본을 가져오지 못해 MIDI로 대체합니다.",
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
        midi.tracks.forEach((track) => {
          track.notes.forEach((note) => {
            const midiNum = note.midi;
            const start = note.time;
            const duration = Math.max(note.duration, 0.05);

            Tone.Transport.schedule(() => {
              if (isCancelled) return;
              if (activeMidiNotes.size < MAX_POLY) {
                activeMidiNotes.add(midiNum);
              }
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
            flushActiveNotes();
          },
          stop: () => {
            Tone.Transport.stop();
            Tone.Transport.seconds = 0;
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
        console.error("MIDI 변환 실패:", err);
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

    const sendAudioToBackend = async () => {
      try {
        onStatusChange?.("MIDI 변환 중...");

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
            "오디오 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요."
          );
        }

        const conversion = await parseConversionResponse(uploadRes);
        if (conversion.message) {
          onStatusChange?.(conversion.message);
        }

        await fetchAndPlayMidi(conversion);
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
    onMidiEvent,
    onStatusChange,
    onTransportReady,
    onTransportReset,
    onMidiReady,
  ]);

  return null;
}
