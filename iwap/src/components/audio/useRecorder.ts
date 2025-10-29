import { useRef, useState } from "react";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setAudioUrl(URL.createObjectURL(blob));
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
    setIsRecording(false);
    mediaRecorderRef.current = null;
  };

  return { isRecording, audioUrl, startRecording, stopRecording };
}
