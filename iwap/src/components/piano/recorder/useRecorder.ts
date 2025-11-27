import { useState, useRef, useCallback, useEffect } from "react";

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

  // [수정] 확장자 결정 로직 단순화 (녹음된 데이터의 mimeType 기반)
  const getExtension = (mimeType: string) => {
    // Safari 등은 audio/mp4를 기본으로 쓸 확률이 높음
    if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    // 나머지는 안전하게 webm 처리 (혹은 mp3)
    return "webm";
  };

  const startRecording = useCallback(async () => {
    try {
      revokeUrl();
      setAudioUrl(null);
      setAudioFile(null);
      chunksRef.current = [];

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // 모바일: 오디오 처리 최소화 (Raw에 가깝게)
      const constraints = {
        audio: isMobile
          ? {
              echoCancellation: false, // 끄는 것이 오히려 안정적일 수 있음 (기기 기본값 사용)
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

      // [핵심 수정] 옵션 없이 생성 -> 브라우저가 알아서 최적 코덱 선택
      const recorder = new MediaRecorder(stream); 
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsProcessing(true);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // [핵심] 브라우저가 실제로 사용한 mimeType 확인
        const recordedMimeType = recorder.mimeType || "audio/webm"; // fallback
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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