import { useEffect, useRef, useState } from "react";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const assignAudioFile = (file: File) => {
    revokeObjectUrl();
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setAudioFile(file);
    setAudioUrl(nextUrl);
    setIsRecording(false);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Prefer webm with opus (widely supported), fall back gracefully
    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm;codecs=vorbis",
      "audio/webm",
    ];
    const isSupported = (type: string) =>
      typeof MediaRecorder !== "undefined" &&
      typeof (MediaRecorder as any).isTypeSupported === "function" &&
      (MediaRecorder as any).isTypeSupported(type);
    const chosenMime = preferredTypes.find(isSupported) || "";

    const options = chosenMime ? { mimeType: chosenMime } : undefined;
    const recorder = new MediaRecorder(stream, options as MediaRecorderOptions);
    const chunks: BlobPart[] = [];

    const handleData = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const handleStop = () => {
      const outType = chosenMime || (recorder as any).mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: outType });
      const subtype = outType.includes("/") ? outType.split("/")[1] : "webm";
      const extension = subtype.split(";")[0] || "webm";
      const file = new File(
        [blob],
        `voice-${Date.now()}.${extension}`,
        { type: outType }
      );
      assignAudioFile(file);
      recorder.removeEventListener("dataavailable", handleData);
      recorder.removeEventListener("stop", handleStop);
    };

    recorder.addEventListener("dataavailable", handleData);
    recorder.addEventListener("stop", handleStop);

    // Provide a timeslice to ensure periodic chunk flush (prevents truncation)
    recorder.start(1000); // ms
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      try {
        rec.requestData(); // flush last chunk
      } catch {}
      rec.stop();
    }
    // Stop tracks to finalize encoders cleanly
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const setAudioFromFile = (file: File | null) => {
    if (!file) return;
    assignAudioFile(file);
  };

  const reset = () => {
    revokeObjectUrl();
    setAudioFile(null);
    setAudioUrl(null);
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, []);

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
