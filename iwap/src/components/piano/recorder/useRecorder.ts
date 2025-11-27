import { useEffect, useRef, useState } from "react";
// @ts-ignore
import * as lamejs from 'lamejs';

function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

async function resampleToMono(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    return offlineContext.startRendering();
}

function encodeMP3(samples: Int16Array, sampleRate: number) {
  const buffer: Int8Array[] = [];
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 64); // Mono, sampleRate, 64kbps
  const blockSize = 1152;

  for (let i = 0; i < samples.length; i += blockSize) {
    const sampleChunk = samples.subarray(i, i + blockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      buffer.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    buffer.push(mp3buf);
  }

  return new Blob(buffer as unknown as BlobPart[], { type: "audio/mp3" });
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
    // Cleanup previous resources if any
    if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions | undefined = undefined;
      
      // Prefer common formats
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus"
      ];

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          break;
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Stop tracks immediately
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        try {
            // Convert to MP3
            const arrayBuffer = await blob.arrayBuffer();
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext();
            
            try {
                const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // Downsample to 22050Hz to reduce load and file size
                const targetSampleRate = 22050;
                const resampledBuffer = await resampleToMono(decodedBuffer, targetSampleRate);
                
                const pcmData = resampledBuffer.getChannelData(0);
                const int16Data = floatTo16BitPCM(pcmData);
                
                const mp3Blob = encodeMP3(int16Data, targetSampleRate);
                const mp3File = new File([mp3Blob], `voice-${Date.now()}.mp3`, { type: "audio/mp3" });
                
                assignAudioFile(mp3File);
            } finally {
                audioContext.close();
            }
        } catch (e) {
            console.error("MP3 conversion failed, falling back to original format", e);
            let ext = "webm";
            if (blob.type.includes("mp4")) ext = "mp4";
            else if (blob.type.includes("aac")) ext = "aac";
            else if (blob.type.includes("ogg")) ext = "ogg";
            else if (blob.type.includes("wav")) ext = "wav";
            
            const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
            assignAudioFile(file);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
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
