import { useState, useRef, useCallback, useEffect } from "react";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  // [추가] 녹음 후 데이터 처리 및 메모리 정리 중인지 여부
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

  // 브라우저별 최적 MIME Type 탐색
  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus", // Chrome, Firefox (Best quality/size)
      "audio/webm",             // Standard WebM
      "audio/mp4",              // Safari (iOS/Desktop)
      "audio/aac",              // Safari fallback
      "audio/ogg",              // Older Firefox
      ""                        // Browser Default
    ];

    for (const type of types) {
      if (
        type === "" ||
        (typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(type))
      ) {
        return type;
      }
    }
    return "";
  };

  const getExtension = (mimeType: string) => {
    if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const startRecording = useCallback(async () => {
    try {
      revokeUrl();
      setAudioUrl(null);
      setAudioFile(null);
      chunksRef.current = [];

      // 모바일 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // 모바일 메모리 절약을 위해 오디오 옵션 최소화
      const constraints = {
        audio: isMobile
          ? true
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // [핵심 로직] 녹음 종료 시 안정성 확보 시퀀스
      recorder.onstop = async () => {
        // 1. 하드웨어(마이크) 즉시 해제
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // 2. UI를 '처리 중' 상태로 변경
        setIsProcessing(true);

        // 3. iOS Safari가 메모리를 정리할 시간을 줌 (Safety Break)
        await new Promise((resolve) => setTimeout(resolve, 300));

        const recordedMimeType = recorder.mimeType || mimeType || "audio/webm";
        const extension = getExtension(recordedMimeType);

        try {
          // 4. Blob 및 File 생성
          const blob = new Blob(chunksRef.current, { type: recordedMimeType });
          const file = new File(
            [blob],
            `recording-${Date.now()}.${extension}`,
            { type: recordedMimeType }
          );

          const url = URL.createObjectURL(blob);

          // 5. 데이터 상태 업데이트
          setAudioUrl(url);
          setAudioFile(file);

          // 6. 렌더링 충돌 방지를 위해 약간 더 지연 후 처리 완료 해제
          setTimeout(() => {
            setIsProcessing(false);
          }, 100);

        } catch (error) {
          console.error("Blob creation failed", error);
          setIsProcessing(false);
        }
      };

      // 1초 단위로 데이터를 끊어 저장 (메모리 스파이크 방지)
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
    isProcessing, // Export
    audioUrl,
    audioFile,    // Export
    startRecording,
    stopRecording,
    setAudioFromFile,
    reset,
  };
}