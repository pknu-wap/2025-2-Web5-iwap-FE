import { useState, useRef, useCallback, useEffect } from "react";
import { context, start } from "tone"; // [최적화] 필요한 모듈만 import

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const revokeUrl = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const getExtension = (mimeType: string) => {
    if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const startRecording = useCallback(async () => {
    try {
      // [핵심 수정] 녹음 시작(User Interaction) 시점에 오디오 엔진 권한 확보
      if (context.state !== 'running') {
        await start().catch((err) => console.warn("Tone start warn:", err));
        console.log("Audio Engine started on user interaction");
      }

      revokeUrl();
      setAudioUrl(null);
      setAudioFile(null);
      chunksRef.current = [];

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      const constraints = {
        audio: isMobile
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // [최적화] 브라우저별 최적의 MimeType 탐색
      let options: MediaRecorderOptions = {};
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus",
      ];

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          console.log(`Using mimeType: ${type}`);
          break;
        }
      }

      // 코덱 지정 (지원되는 경우)
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // 1. 하드웨어 해제
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // 2. 처리 상태 진입
        setIsProcessing(true);

        // 3. 메모리 정리 시간 확보 (Safety Break)
        await new Promise((resolve) => setTimeout(resolve, 300));

        const recordedMimeType = recorder.mimeType || "audio/webm";
        const extension = getExtension(recordedMimeType);

        try {
          const blob = new Blob(chunksRef.current, { type: recordedMimeType });
          const file = new File(
            [blob],
            `recording-${Date.now()}.${extension}`,
            { type: recordedMimeType }
          );

          const url = URL.createObjectURL(blob);

          setAudioUrl(url);
          setAudioFile(file);

          setTimeout(() => {
            setIsProcessing(false);
          }, 100);

        } catch (error) {
          console.error("Blob creation failed", error);
          setIsProcessing(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("녹음 시작 실패:", error);
      alert("마이크 접근 권한이 필요합니다.");
      setIsRecording(false);
    }
  }, [revokeUrl]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const setAudioFromFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      revokeUrl();
      const url = URL.createObjectURL(file);
      setAudioFile(file);
      setAudioUrl(url);
      setIsRecording(false);
      setIsProcessing(false);
    },
    [revokeUrl]
  );

  const reset = useCallback(() => {
    revokeUrl();
    setAudioUrl(null);
    setAudioFile(null);
    setIsRecording(false);
    setIsProcessing(false);
    chunksRef.current = [];
  }, [revokeUrl]);

  useEffect(() => {
    return () => {
      revokeUrl();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [revokeUrl]);

  return {
    isRecording,
    isProcessing,
    audioUrl,
    audioFile,
    startRecording,
    stopRecording,
    setAudioFromFile,
    reset,
  };
}