"use client";

import { useEffect } from "react";
import { 
  Transport, 
  context, 
  start as startAudioContext, 
  getContext, 
  getDestination 
} from "tone";
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
    return "네트워크 연결을 확인해주세요.";
  }
  if (err instanceof Error) {
    if (err.message.includes("413")) {
      return "파일 용량이 너무 큽니다.";
    }
    return "일시적인 오류가 발생했습니다.";
  }
  return "알 수 없는 오류가 발생했습니다.";
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

    onStatusChange?.("분석 준비 중...");
    onTransportReset?.();

    const flushActiveNotes = () => {
      if (activeMidiNotes.size === 0) return;
      activeMidiNotes.forEach((note) =>
        onMidiEvent({ type: "off", note })
      );
      activeMidiNotes.clear();
    };

    const disposeTransport = () => {
      if (Transport.state !== "stopped") {
        Transport.stop();
      }
      Transport.cancel(0);
      Transport.seconds = 0;
      flushActiveNotes();
    };

    const pollForFile = async (url: string, timeoutMs = 120000): Promise<Response> => {
      const startTime = Date.now();
      // attempt 변수는 로직 제어용으로만 사용하고 표시는 하지 않음
      let attempt = 0; 

      while (Date.now() - startTime < timeoutMs) {
        if (isCancelled) throw new Error("Cancelled");
        attempt++;
        
        try {
          // [수정] attempt 횟수 표시 제거
          onStatusChange?.("분석 중...");

          const res = await fetch(url);
          if (res.status === 200) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const clone = res.clone();
                const text = await clone.text();
                throw new Error(`JSON Retry: ${text.substring(0, 50)}`);
            }
            return res;
          }
          if (res.status === 202) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw new Error(`Status: ${res.status}`);
        } catch (e) {
          if (isCancelled) throw e;
          console.warn("Polling retry...", e);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error("변환 시간이 초과되었습니다.");
    };

    const processMidiData = async (midiArray: ArrayBuffer, taskId: string) => {
      onStatusChange?.("데이터 처리 중...");

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
        console.warn("MP3 fetch failed", mp3Error);
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

      if (context.state !== 'running') {
        await startAudioContext();
      }
      
      const ctx = getContext();
      ctx.lookAhead = 0.2; 
      
      // Tone.js 소리 끄기 (VoiceToPiano에서 MP3 재생하므로 충돌 방지)
      getDestination().volume.value = -Infinity; 

      disposeTransport();
      
      onStatusChange?.("노트 생성 준비 중...");

      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const midiNum = note.midi;
          const noteStart = note.time;
          const duration = Math.max(note.duration, 0.05);

          Transport.schedule(() => {
            if (isCancelled) return;
            if (activeMidiNotes.size < MAX_POLY) {
              activeMidiNotes.add(midiNum);
              onMidiEvent({ type: "on", note: midiNum });
              
              Transport.scheduleOnce(() => {
                if (isCancelled) return;
                activeMidiNotes.delete(midiNum);
                onMidiEvent({ type: "off", note: midiNum });
              }, noteStart + duration);
            }
          }, noteStart);
        });
      });

      const duration = midi.duration || midi.tracks.reduce(
        (max, track) => Math.max(max, ...track.notes.map((n) => n.time + n.duration)), 0
      );

      Transport.schedule(() => {
        Transport.stop();
        Transport.seconds = 0;
        flushActiveNotes();
      }, duration);

      const controls: MidiTransportControls = {
        duration,
        start: async () => {
          if (isCancelled) return;
          if (context.state !== 'running') {
             await startAudioContext().catch(() => {});
          }
          if (Transport.state !== "started") {
            Transport.start();
          }
        },
        pause: () => {
          Transport.pause();
          flushActiveNotes();
        },
        stop: () => {
          Transport.stop();
          Transport.seconds = 0;
          flushActiveNotes();
        },
        seek: (seconds: number, resume = false) => {
          const clamped = Math.max(0, Math.min(duration, seconds));
          Transport.seconds = clamped;
          if (resume) Transport.start();
        },
        getPosition: () => Transport.seconds,
        getState: () => Transport.state as "started" | "stopped" | "paused",
      };

      onStatusChange?.("분석 완료!");
      onTransportReady?.(controls, conversionContext);
    };
    
    const performConversion = async () => {
      try {
        onStatusChange?.("분석 중...");

        const formData = new FormData();
        formData.append("voice", audioFile);

        const uploadRes = await fetch(getBackendUrl("/api/piano"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
           throw new Error(`Upload failed: ${uploadRes.status}`);
        }

        const data = await uploadRes.json();
        const taskId = data.task_id || data.request_id;

        if (!taskId) {
          throw new Error("작업 ID 없음");
        }
        
        const midiRes = await pollForFile(
          getBackendUrl(`/api/piano/midi/${encodeURIComponent(taskId)}`)
        );
        
        if (!midiRes.ok) {
          throw new Error("결과 파일 오류");
        }

        const midiArray = await midiRes.arrayBuffer();
        await processMidiData(midiArray, taskId);

      } catch (err) {
        if (!isCancelled) {
          onStatusChange?.(describeFetchError(err));
        }
      }
    };

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