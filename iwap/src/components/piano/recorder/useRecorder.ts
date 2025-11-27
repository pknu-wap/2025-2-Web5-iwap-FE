import { useEffect, useRef, useState, useCallback } from "react";

// ----------------------------------------------------------------------
// 1. Web Worker Code (백그라운드에서 인코딩 및 버퍼링 담당)
// ----------------------------------------------------------------------
const workerCode = `
self.onmessage = function(e) {
  const { command, data, sampleRate } = e.data;

  if (command === 'init') {
    self.sampleRate = sampleRate;
    self.pcmData = []; // PCM 데이터를 모을 배열
    self.dataLength = 0;
  } 
  else if (command === 'process') {
    // Float32Array를 받아서 Int16Array로 실시간 변환하여 저장
    const input = data;
    const buffer = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    self.pcmData.push(buffer);
    self.dataLength += buffer.length;
  } 
  else if (command === 'export') {
    // 저장된 PCM 조각들을 하나로 합침
    const totalBuffer = new Int16Array(self.dataLength);
    let offset = 0;
    for (const chunk of self.pcmData) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // WAV 헤더 생성
    const wavHeader = createWavHeader(self.dataLength, self.sampleRate);
    
    // Blob 생성 후 전송
    const blob = new Blob([wavHeader, totalBuffer], { type: 'audio/wav' });
    self.postMessage({ command: 'export', blob });
    
    // 메모리 정리
    self.pcmData = [];
    self.dataLength = 0;
  }
};

function createWavHeader(dataLength, sampleRate) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  
  const numChannels = 1; // Mono
  const bitDepth = 16;
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const fileLength = 36 + dataLength * 2; // dataLength is in samples (16bit = 2bytes)

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, fileLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataLength * 2, true);

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
`;

// ----------------------------------------------------------------------
// 2. AudioWorklet Code (오디오 스레드에서 Raw Data 캡처)
// ----------------------------------------------------------------------
const workletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono Channel
      // 메인 스레드로 Raw Data 전송
      this.port.postMessage(channelData);
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

// ----------------------------------------------------------------------
// 3. React Hook (Main Thread)
// ----------------------------------------------------------------------
export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Blob URL 정리 및 상태 초기화
  const reset = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioFile(null);
    setIsRecording(false);
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      reset(); // 이전 상태 초기화

      // 1. 마이크 권한 획득
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. AudioContext 생성 (SampleRate 설정: 22050Hz 권장)
      // 낮은 SampleRate를 쓰면 CPU 부하가 적고 파일 용량이 절반이 됩니다.
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 22050, 
      });
      contextRef.current = context;

      // 3. Web Worker 설정
      const workerBlob = new Blob([workerCode], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(workerBlob));
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data.command === 'export') {
          // Worker에서 완성된 Blob 수신
          const wavBlob = e.data.blob;
          const wavFile = new File([wavBlob], `voice-${Date.now()}.wav`, { type: "audio/wav" });
          
          const url = URL.createObjectURL(wavBlob);
          setAudioUrl(url);
          setAudioFile(wavFile);
          
          // Worker 종료
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.postMessage({ command: 'init', sampleRate: context.sampleRate });

      // 4. AudioWorklet 설정
      const workletBlob = new Blob([workletCode], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(workletBlob);
      await context.audioWorklet.addModule(workletUrl);

      // 5. 노드 연결: Mic -> Source -> Worklet
      const source = context.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(context, 'recorder-processor');
      
      workletNode.port.onmessage = (e) => {
        // Worklet(Audio Thread) -> Main Thread -> Worker(Bg Thread)
        // (SharedBuffer를 쓰지 않는 한 Main Thread를 거쳐야 함. 하지만 단순 전달이라 매우 빠름)
        if (workerRef.current) {
          workerRef.current.postMessage({ command: 'process', data: e.data });
        }
      };

      source.connect(workletNode);
      workletNode.connect(context.destination); // (필요시) 모니터링용, 보통은 연결 안 함

      sourceRef.current = source;
      workletNodeRef.current = workletNode;

      setIsRecording(true);
    } catch (err) {
      console.error("Recording failed", err);
      reset();
    }
  };

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    // 1. 녹음 중단 요청 (Worker에게 파일 뱉어내라고 지시)
    if (workerRef.current) {
      workerRef.current.postMessage({ command: 'export' });
    }

    // 2. 리소스 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (contextRef.current) {
      await contextRef.current.close();
      contextRef.current = null;
    }

    setIsRecording(false);
  }, [isRecording]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setAudioFromFile = (file: File | null) => {
      if (!file) return;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const nextUrl = URL.createObjectURL(file);
      setAudioFile(file);
      setAudioUrl(nextUrl);
      setIsRecording(false);
    };

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