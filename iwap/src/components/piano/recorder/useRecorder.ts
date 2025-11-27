// useRecorder.ts
import { useState, useRef, useCallback, useEffect } from "react";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // 메모리 누수 방지를 위한 URL 해제 함수
  const revokeUrl = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  // 브라우저가 지원하는 최적의 MIME Type 찾기
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
      if (type === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type))) {
        return type;
      }
    }
    return "";
  };

  // MIME Type에 따른 적절한 확장자 결정
  const getExtension = (mimeType: string) => {
    if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const startRecording = useCallback(async () => {
    try {
      // 이전 녹음 데이터 초기화
      revokeUrl();
      setAudioUrl(null);
      setAudioFile(null);
      chunksRef.current = [];

      // 1. 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });
      streamRef.current = stream;

      // 2. 지원되는 MIME Type 감지
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      // 3. MediaRecorder 생성
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      // 4. 데이터 수집 이벤트 핸들러
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // 5. 녹음 종료 이벤트 핸들러 (파일 생성)
      recorder.onstop = () => {
        const recordedMimeType = recorder.mimeType || mimeType || "audio/webm";
        const extension = getExtension(recordedMimeType);
        
        // Blob 생성
        const blob = new Blob(chunksRef.current, { type: recordedMimeType });
        
        // File 객체 생성 (서버 전송용)
        const file = new File(
          [blob],
          `recording-${Date.now()}.${extension}`,
          { type: recordedMimeType }
        );

        const url = URL.createObjectURL(blob);
        
        // 상태 업데이트 순서 보장
        setAudioUrl(url);
        setAudioFile(file);
        
        // 스트림 트랙 종료 (브라우저 상단 녹음 아이콘 제거)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
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

  const setAudioFromFile = useCallback((file: File | null) => {
    if (!file) return;
    revokeUrl();
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setIsRecording(false);
  }, [revokeUrl]);

  const reset = useCallback(() => {
    revokeUrl();
    setAudioUrl(null);
    setAudioFile(null);
    setIsRecording(false);
    chunksRef.current = [];
  }, [revokeUrl]);

  // 컴포넌트 언마운트 시 정리
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
    audioUrl,
    audioFile,
    startRecording,
    stopRecording,
    setAudioFromFile,
    reset,
  };
}