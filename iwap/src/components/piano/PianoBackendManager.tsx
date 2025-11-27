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

type PianoBackendManagerProps = {
  audioUrl: string | null;
  audioFile: File | null;
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
  return path.startsWith("/") ? path : `/${path}`;
};

const describeFetchError = (err: unknown) => {
  if (err instanceof TypeError) {
    return "네트워크 연결 또는 백엔드 주소를 확인해주세요.";
  }
  if (err instanceof Error) {
    if (err.message.includes("413")) {
      return "파일 용량이 너무 큽니다. (서버 제한 초과)";
    }
    if (err.message) {
      return err.message;
    }
  }
  return `알 수 없는 오류가 발생했습니다. (${String(err)})`;
};

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
    if (!audioUrl || !audioFile) return;

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

    const pollForFile = async (url: string, timeoutMs = 120000): Promise<Response> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (isCancelled) throw new Error("Cancelled");
        
        try {
          const res = await fetch(url);
          if (res.status === 200) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const clone = res.clone();
                const text = await clone.text();
                throw new Error(`Server returned JSON instead of MIDI: ${text.substring(0, 200)}`);
            }
            return res;
          }
          if (res.status === 202) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw new Error(`File fetch failed with status: ${res.status}`);
        } catch (e) {
          if (isCancelled) throw e;
          if (e instanceof Error && e.message.startsWith("Server returned JSON")) {
              throw e;
          }
          console.warn("Polling error, retrying...", e);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error("변환 시간이 초과되었습니다.");
    };

    const processMidiData = async (midiArray: ArrayBuffer, taskId: string) => {
      const downloadBaseName = new Date().toISOString().replace(/[:.]/g, "-");
      let downloadBlob: Blob = new Blob([midiArray], { type: "audio/midi" });
      let downloadFilename = `piano-${downloadBaseName}.mid`;
      const mp3Filename = `piano-${downloadBaseName}.mp3`;

      try {
        const mp3Res = await fetch(
          getBackendUrl(`/api/piano/mp3/${encodeURIComponent(taskId)}`)
        );
        if (mp3Res.ok) {
          const mp3Array = await mp3Res.arrayBuffer();
          downloadBlob = new Blob([mp3Array], { type: "audio/mpeg" });
          downloadFilename = mp3Filename;
        }
      } catch (mp3Error) {
        console.warn("Failed to fetch MP3 conversion, falling back to MIDI.", mp3Error);
      }

      const conversionContext: ConversionContext = {
        requestId: taskId,
        midiFilename: `piano-${downloadBaseName}.mid`,
        mp3Filename: mp3Filename,
      };

      onMidiReady?.({
        blob: downloadBlob,
        filename: downloadFilename,
        ...conversionContext,
      });

      const midi = new Midi(midiArray);
      
      // [수정 포인트] RecorderButton에서 이미 start()를 호출했으므로, 
      // 여기서는 상태 체크 후 필요시에만 안전하게 호출
      if (Tone.context.state !== 'running') {
        try {
          await Tone.start();
        } catch (err) {
          console.warn("BackendManager: Tone.start fallback failed", err);
        }
      }
      
      const ctx = Tone.getContext();
      ctx.lookAhead = 0.2; 
      Tone.getDestination().volume.value = -20;

      disposeTransport();
      
      // MIDI Note Scheduling
      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const midiNum = note.midi;
          const start = note.time;
          const duration = Math.max(note.duration, 0.05);

          Tone.Transport.schedule(() => {
            if (isCancelled) return;
            if (activeMidiNotes.size < MAX_POLY) {
              activeMidiNotes.add(midiNum);
              onMidiEvent({ type: "on", note: midiNum });
              
              Tone.Transport.scheduleOnce(() => {
                if (isCancelled) return;
                activeMidiNotes.delete(midiNum);
                onMidiEvent({ type: "off", note: midiNum });
              }, start + duration);
            }
          }, start);
        });
      });

      const duration = midi.duration || midi.tracks.reduce(
        (max, track) => Math.max(max, ...track.notes.map((n) => n.time + n.duration)), 0
      );

      Tone.Transport.schedule(() => {
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        flushActiveNotes();
      }, duration);

      const controls: MidiTransportControls = {
        duration,
        start: async () => {
          if (isCancelled) return;
          // 여기서도 start 체크
          if (Tone.context.state !== 'running') {
            await Tone.start().catch(() => {});
          }
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
        getState: () => Tone.Transport.state as "started" | "stopped" | "paused",
      };

      onStatusChange?.("");
      onTransportReady?.(controls, conversionContext);
    };

    const performConversion = async () => {
      try {
        onStatusChange?.("오디오 업로드 및 변환 중...");

        // [수정] fetch(audioUrl) 제거
        // 이미 가지고 있는 audioFile을 바로 사용 -> 메모리 부족(Crash) 방지

        const formData = new FormData();
        formData.append("voice", audioFile); // <--- File 객체 직접 사용

        const uploadRes = await fetch(getBackendUrl("/api/piano"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
           const errorText = await uploadRes.text();
           throw new Error(`Upload failed: ${uploadRes.status} ${errorText}`);
        }

        const data = await uploadRes.json();
        const taskId = data.task_id || data.request_id;

        if (!taskId) {
          throw new Error("서버로부터 작업 ID를 받지 못했습니다.");
        }

        onStatusChange?.("결과 다운로드 중...");
        
        const midiRes = await pollForFile(
          getBackendUrl(`/api/piano/midi/${encodeURIComponent(taskId)}`)
        );
        
        if (!midiRes.ok) {
          throw new Error("MIDI 파일을 받아오지 못했습니다.");
        }

        const midiArray = await midiRes.arrayBuffer();
        await processMidiData(midiArray, taskId);

      } catch (err) {
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

    // [핵심 수정] 즉시 실행하지 않고 500ms 지연 후 실행 (Debounce)
    // 모바일에서 화면 전환 렌더링과 무거운 업로드 작업이 겹치는 것을 방지
    const uploadTimer = setTimeout(() => {
      void performConversion();
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(uploadTimer);
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