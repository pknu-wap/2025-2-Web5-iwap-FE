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
  // CORS 문제를 피하고 백엔드 URL을 숨기기 위해 항상 동일 출처 API 라우트를 우선 사용합니다.
  // Next.js API 라우트가 실제 백엔드 서버로 프록시 역할을 합니다.
  return path.startsWith("/") ? path : `/${path}`;
};

const describeFetchError = (err: unknown) => {
  if (err instanceof TypeError) {
    return "네트워크 연결 또는 백엔드 주소를 확인해주세요.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
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
    throw new Error("유효하지 않은 응답입니다.");
  }

  const payload = data as Record<string, unknown>;
  // 백엔드 응답이 { "task_id": "..." } 형태이므로 이를 requestId로 매핑합니다.
  const requestId = (payload.task_id as string) || (payload.requestId as string);

  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new Error("요청 ID(task_id)를 받지 못했습니다.");
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
 * 피아노 백엔드와의 통신을 처리하고 MIDI 재생을 스케줄링합니다.
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

        const pollForFile = async (url: string, timeoutMs = 60000): Promise<Response> => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            if (isCancelled) throw new Error("Cancelled");
            
            const res = await fetch(url);
            if (res.status === 200) {
              return res;
            }
            if (res.status === 202) {
              // Still processing, wait and retry
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            // If it's not 200 or 202, it's an error (e.g. 404, 500)
            if (!res.ok) {
               throw new Error(`File fetch failed with status: ${res.status}`);
            }
             // If ok but not 200/202 (unlikely for this API but possible), return it
            return res;
          }
          throw new Error("변환 시간이 초과되었습니다.");
        };

        const midiRes = await pollForFile(
          getBackendUrl(`/api/piano/midi/${requestToken}`)
        );
        
        const midiArray = await midiRes.arrayBuffer();
        const downloadBaseName = new Date().toISOString().replace(/[:.]/g, "-");
        let downloadBlob: Blob = new Blob([midiArray], {
          type: "audio/midi",
        });
        let downloadFilename = conversion.midiFilename ?? `piano-${downloadBaseName}.mid`;

        try {
          const mp3Res = await pollForFile(
            getBackendUrl(`/api/piano/mp3/${requestToken}`)
          );
          const mp3Array = await mp3Res.arrayBuffer();
          downloadBlob = new Blob([mp3Array], { type: "audio/mpeg" });
          downloadFilename =
            conversion.mp3Filename ?? `piano-${downloadBaseName}.mp3`;
        } catch (mp3Error) {
          console.warn(
            "Failed to fetch MP3 conversion, falling back to MIDI.",
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
        // 모바일에서의 안정성을 위해 lookAhead를 약간 늘립니다.
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
        console.error("MIDI conversion failed:", err);
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

        // Blob을 File 객체로 변환하여 파일명을 명시적으로 지정합니다.
        // 이는 백엔드에서 파일 확장자를 올바르게 인식하도록 돕습니다.
        const file = new File([blob], "voice.webm", { type: blob.type || "audio/webm" });

        const formData = new FormData();
        formData.append("voice", file);

        const uploadRes = await fetch(getBackendUrl("/api/piano"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(
            "오디오 업로드에 실패했습니다. 나중에 다시 시도해주세요."
          );
        }

        const conversion = await parseConversionResponse(uploadRes);
        if (conversion.message) {
          onStatusChange?.(conversion.message);
        }

        await fetchAndPlayMidi(conversion);
      } catch (err) {
        console.error("Audio upload failed:", err);
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
