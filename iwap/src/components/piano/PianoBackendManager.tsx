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
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;
      flushActiveNotes();
    };

    const pollForFile = async (url: string, timeoutMs = 120000): Promise<Response> => {
      const start = Date.now();
      let attempt = 0;
      while (Date.now() - start < timeoutMs) {
        if (isCancelled) throw new Error("Cancelled");
        attempt++;
        
        try {
          // 디버깅: 상태 메시지 업데이트
          onStatusChange?.(`분석 중... (${attempt})`);

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

      // [핵심 수정] 오디오 엔진 시작 시 무한 대기(멈춤) 방지
      // 비동기 시점에 start 호출 시 iOS에서 Block될 수 있으므로 타임아웃 적용
      if (Tone.context.state !== 'running') {
        onStatusChange?.("오디오 엔진 시작 중...");
        try {
          await Promise.race([
            Tone.start(),
            new Promise((_, reject) => setTimeout(() => reject("Timeout"), 500))
          ]);
          console.log("Tone started via BackendManager");
        } catch (err) {
          // 이미 RecorderButton에서 켰거나, iOS 정책상 여기서 켜는 게 불가능한 경우
          // 경고만 남기고 다음 단계로 진행 (멈춤 방지)
          console.warn("Tone start skipped/timed-out (expected behavior):", err);
        }
      }
      
      const ctx = Tone.getContext();
      ctx.lookAhead = 0.2; 
      Tone.getDestination().volume.value = -20;

      disposeTransport();
      
      onStatusChange?.("노트 생성 중...");

      // [수정] track.notes 사용 (tracks 속성 오류 수정됨)
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