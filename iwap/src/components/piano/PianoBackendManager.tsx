"use client";

import { useEffect } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

// ... (Type 정의 동일) ...
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
  const msg = err instanceof Error ? err.message : String(err);
  return `오류: ${msg.substring(0, 30)}...`; // 화면에 보이도록 짧게 자름
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

    onStatusChange?.("초기화 중..."); // [디버그]
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

    // [디버그] Polling 횟수 표시를 위해 onStatusChange 인자 추가
    const pollForFile = async (url: string, timeoutMs = 120000): Promise<Response> => {
      const start = Date.now();
      let attempt = 0;

      while (Date.now() - start < timeoutMs) {
        if (isCancelled) throw new Error("Cancelled");
        attempt++;
        
        try {
          // [디버그] 현재 시도 횟수 표시
          onStatusChange?.(`변환 대기 중... (${attempt}회)`);

          const res = await fetch(url);
          if (res.status === 200) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                // JSON이 오면 아직 처리 안 된 것일 수 있음 (혹은 에러)
                console.log("JSON received in polling, retrying...");
            } else {
                return res; // 파일(Binary) 도착
            }
          }
          
          if (res.status === 202) {
            // 202 Accepted: 아직 처리 중
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          
          // 4xx, 5xx 에러
          if (res.status >= 400) {
             const text = await res.text();
             throw new Error(`Poll Error ${res.status}: ${text.substring(0, 20)}`);
          }

        } catch (e) {
          if (isCancelled) throw e;
          console.warn("Polling retry...", e);
          // 네트워크 에러 시에도 잠시 대기 후 재시도
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error("변환 시간 초과 (Timeout)");
    };

    const processMidiData = async (midiArray: ArrayBuffer, taskId: string) => {
      onStatusChange?.("결과 처리 중..."); // [디버그]

      const downloadBaseName = new Date().toISOString().replace(/[:.]/g, "-");
      let downloadBlob: Blob = new Blob([midiArray], { type: "audio/midi" });
      let downloadFilename = `piano-${downloadBaseName}.mid`;
      const mp3Filename = `piano-${downloadBaseName}.mp3`;

      // MP3 확인 (선택 사항)
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

      onStatusChange?.("MIDI 파싱 중..."); // [디버그]
      const midi = new Midi(midiArray);

      // Tone.js 시작 (iOS 정책 확인)
      if (Tone.context.state !== 'running') {
        onStatusChange?.("오디오 엔진 시작 중..."); // [디버그]
        try {
          await Tone.start();
          console.log("Tone started successfully");
        } catch (err) {
          console.warn("Tone start failed", err);
          onStatusChange?.("오디오 권한 실패 (터치 필요)");
        }
      }
      
      const ctx = Tone.getContext();
      ctx.lookAhead = 0.2; 
      Tone.getDestination().volume.value = -20;

      disposeTransport();
      
      onStatusChange?.("노트 스케줄링 중..."); // [디버그]

      // MIDI Scheduling
      midi.tracks.forEach((track) => {
        // Tonejs/midi 최신 버전 기준: track.notes
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

      onStatusChange?.("준비 완료!"); // [디버그]
      onTransportReady?.(controls, conversionContext);
    };

    const performConversion = async () => {
      try {
        const sizeMB = (audioFile.size / (1024 * 1024)).toFixed(2);
        onStatusChange?.(`업로드 중... (${sizeMB}MB)`); // [디버그]

        const formData = new FormData();
        formData.append("voice", audioFile);

        const uploadRes = await fetch(getBackendUrl("/api/piano"), {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
           const errText = await uploadRes.text();
           throw new Error(`Upload ${uploadRes.status}: ${errText.substring(0, 20)}`);
        }

        const data = await uploadRes.json();
        const taskId = data.task_id || data.request_id;

        if (!taskId) {
          throw new Error("ID 응답 없음");
        }

        onStatusChange?.("서버 처리 대기 중..."); // [디버그]
        
        const midiRes = await pollForFile(
          getBackendUrl(`/api/piano/midi/${encodeURIComponent(taskId)}`)
        );
        
        if (!midiRes.ok) {
          throw new Error("결과 다운로드 실패");
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