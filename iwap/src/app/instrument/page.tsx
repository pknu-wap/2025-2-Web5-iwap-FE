"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";

/**
 * === Assumed BE JSON contract ===
 * POST /api/piano accepts multipart/form-data { file: Blob }
 * Returns JSON:
 * {
 *   bpm?: number,
 *   tempoFactor?: number,                  // optional multiplier
 *   chords?: Array<{ name: string; start: number; duration: number }>,
 *   tracks: Array<{
 *     id: string;
 *     instrument?: string;                 // "piano" | "strings" | ...
 *     notes: Array<{
 *       midi: number;                      // 21..108 typical
 *       time: number;                      // seconds from 0
 *       duration: number;                  // seconds
 *       velocity?: number;                 // 0..1
 *     }>;
 *   }>
 * }
 *
 * Any missing fields are safely defaulted below.
 */

// ---------- Utilities ----------
const midiToFreq = (midi: number) => Tone.Frequency(midi, "midi").toFrequency();

// Simple color for chord background feedback
const hueAt = (t: number) => `hsl(${Math.floor((t * 47) % 360)} 70% 60%)`;

// ---------- Tone.js graph ----------

type PlayerGraph = {
  master: Tone.Volume;
  parts: Record<string, Tone.Part>;
  synths: Record<string, Tone.PolySynth | Tone.Sampler | Tone.Synth>;
};

function buildSynth(kind: string): Tone.PolySynth | Tone.Sampler | Tone.Synth {
  switch (kind) {
    case "strings":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 1.5 },
      });
    case "brass":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.8 },
      });
    case "woodwind":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.6 },
      });
    case "percussion":
      return new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0.0, release: 0.03 },
      });
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.8 },
      });
  }
}

function disposeGraph(g?: PlayerGraph) {
  if (!g) return;
  Object.values(g.parts).forEach((p) => p.dispose());
  Object.values(g.synths).forEach((s) => s.dispose());
  g.master.dispose();
}

// ---------- Component ----------
export default function PianoOrchestraPage() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [tempo, setTempo] = useState<number>(120);
  const [thickness, setThickness] = useState<number>(3); // chord thickness 1..6
  const [masterVol, setMasterVol] = useState<number>(-8); // dB
  const [instrument, setInstrument] = useState<string>("piano");
  const [chordBg, setChordBg] = useState<string>("#0e0e10");
  const [chords, setChords] = useState<Array<{ name: string; start: number; duration: number }>>([]);

  const graphRef = useRef<PlayerGraph | null>(null);
  const transportStartedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync Tone transport settings
  useEffect(() => {
    Tone.getContext().lookAhead = 0.1;
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  useEffect(() => {
    const g = graphRef.current;
    if (g) g.master.volume.value = masterVol;
  }, [masterVol]);

  // Background chord color feedback
  useEffect(() => {
    if (!chords.length) return;
    const id = Tone.Transport.scheduleRepeat((time) => {
      const t = Tone.Transport.seconds;
      const c = chords.find((c) => t >= c.start && t < c.start + c.duration);
      if (c) setChordBg(hueAt(c.start));
    }, 0.1);
    return () => Tone.Transport.clear(id);
  }, [chords]);

  const stopAll = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }, []);

  const startTransport = useCallback(async () => {
    if (!transportStartedRef.current) {
      await Tone.start();
      transportStartedRef.current = true;
    }
    Tone.Transport.start();
  }, []);

  const clearOld = useCallback(() => {
    stopAll();
    disposeGraph(graphRef.current || undefined);
    graphRef.current = null;
  }, [stopAll]);

  const buildFromJson = useCallback(async (data: any) => {
    clearOld();

    const bpm: number = data?.bpm || 120;
    const tempoFactor: number = data?.tempoFactor || 1;
    setTempo(Math.max(30, Math.min(220, Math.round(bpm * tempoFactor))));

    const master = new Tone.Volume(masterVol).toDestination();
    const parts: PlayerGraph["parts"] = {};
    const synths: PlayerGraph["synths"] = {};

    const tracks: Array<any> = Array.isArray(data?.tracks) ? data.tracks : [
      {
        id: "lead",
        instrument,
        notes: Array.isArray(data?.notes) ? data.notes : [],
      },
    ];

    // Build parts per track
    tracks.forEach((t: any, idx: number) => {
      const kind = t.instrument || (idx === 0 ? instrument : "strings");
      const synth = buildSynth(kind).connect(master);
      synths[t.id || `track${idx}`] = synth;

      const events = (t.notes || []).map((n: any) => ({
        time: n.time || 0,
        note: n.midi != null ? midiToFreq(n.midi) : n.note || 440,
        dur: Math.max(0.05, n.duration || 0.25),
        vel: Math.max(0, Math.min(1, n.velocity ?? 0.9)),
      }));

      const part = new Tone.Part((time, ev: any) => {
        if (synth instanceof Tone.PolySynth) {
          synth.triggerAttackRelease(ev.note as number, ev.dur, time, ev.vel);
        } else if (synth instanceof Tone.Synth) {
          synth.triggerAttackRelease(ev.note as number, ev.dur, time, ev.vel);
        } else {
          // Sampler path
          (synth as any).triggerAttackRelease(Tone.Frequency(ev.note).toNote(), ev.dur, time, ev.vel);
        }
      }, events.map((e) => [e.time, e] as any));

      part.start(0);
      parts[t.id || `track${idx}`] = part;
    });

    // Optional chord lanes for background color feedback
    setChords(Array.isArray(data?.chords) ? data.chords : []);

    graphRef.current = { master, parts, synths };
  }, [clearOld, instrument, masterVol]);

  // Upload mic recording or local file
  const onUpload = useCallback(async (blob: Blob) => {
    setBusy(true);
    setProgress("uploading");
    try {
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      const res = await fetch("/api/piano/", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress("building");
      await buildFromJson(data);
      setProgress("ready");
      await startTransport();
    } catch (e: any) {
      console.error(e);
      alert(`변환 실패: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }, [buildFromJson, startTransport]);

  // --- MediaRecorder for quick capture ---
  const recState = useRef<{ rec?: MediaRecorder; chunks: BlobPart[] }>({ chunks: [] });
  const [recOn, setRecOn] = useState(false);

  const startRec = useCallback(async () => {
    setRecOn(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recState.current = { rec, chunks: [] };
    rec.ondataavailable = (e) => recState.current.chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(recState.current.chunks, { type: "audio/webm" });
      await onUpload(blob);
      setRecOn(false);
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
  }, [onUpload]);

  const stopRec = useCallback(() => {
    recState.current.rec?.stop();
  }, []);

  // --- Gesture mock mapping ---
  const onGesture = useCallback((g: "orchestra" | "tempoTap" | "volumePalm" | "nextInstrument", payload?: any) => {
    switch (g) {
      case "orchestra": // both fists
        if (Tone.Transport.state !== "started") startTransport();
        else stopAll();
        break;
      case "tempoTap": // left fist 4 taps
        setTempo((t) => Math.max(40, Math.min(220, Math.round((t + 2) % 221))));
        break;
      case "volumePalm": // left palm
        setMasterVol((v) => Math.max(-30, Math.min(0, v + (payload?.delta ?? -2))));
        break;
      case "nextInstrument": // right hand flick
        setInstrument((prev) => {
          const order = ["piano", "strings", "brass", "woodwind", "percussion"];
          const i = order.indexOf(prev);
          return order[(i + 1) % order.length];
        });
        break;
    }
  }, [startTransport, stopAll]);

  // Rebuild synth types when instrument changes for the first track next play
  useEffect(() => {
    // noop at runtime; applied on next buildFromJson
  }, [instrument]);

  // File upload handler
  const onSelectFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await onUpload(f);
    e.currentTarget.value = "";
  }, [onUpload]);

  // Quick demo from local mock to test parser (no BE)
  const loadMock = useCallback(async () => {
    const mock = {
      bpm: 108,
      chords: [
        { name: "Cmaj7", start: 0, duration: 2 },
        { name: "Fmaj7", start: 2, duration: 2 },
        { name: "G7", start: 4, duration: 2 },
        { name: "Cmaj7", start: 6, duration: 2 },
      ],
      tracks: [
        {
          id: "lead",
          instrument: instrument,
          notes: Array.from({ length: 16 }).map((_, i) => ({
            midi: 60 + (i % Math.max(1, thickness)),
            time: i * 0.5,
            duration: 0.45,
            velocity: 0.8,
          })),
        },
        {
          id: "pad",
          instrument: "strings",
          notes: [
            { midi: 48, time: 0, duration: 2, velocity: 0.6 },
            { midi: 53, time: 2, duration: 2, velocity: 0.6 },
            { midi: 55, time: 4, duration: 2, velocity: 0.6 },
            { midi: 48, time: 6, duration: 2, velocity: 0.6 },
          ],
        },
      ],
    };
    await buildFromJson(mock);
    await startTransport();
  }, [buildFromJson, instrument, startTransport, thickness]);

  // UI
  return (
    <div className="min-h-screen w-full px-6 py-8 bg-black text-neutral-100" style={{ background: chordBg }}>
      <div className="mx-auto max-w-5xl rounded-2xl bg-black/50 p-6 shadow-lg backdrop-blur">
        <h1 className="text-2xl font-semibold">Talking Piano · Orchestra</h1>
        <p className="text-sm text-neutral-300 mt-1">BE: CREPE→Mingus(JSON) → FE: Tone.js 재생·비주얼·제스처</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transport */}
          <div className="col-span-2 rounded-2xl border border-neutral-800 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                onClick={startTransport}
                disabled={busy}
              >시작</button>
              <button
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700"
                onClick={stopAll}
              >정지</button>

              <div className="ml-4 flex items-center gap-2">
                <label className="text-xs">템포 {tempo} BPM</label>
                <input
                  type="range"
                  min={40}
                  max={220}
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                />
              </div>

              <div className="ml-4 flex items-center gap-2">
                <label className="text-xs">마스터 {masterVol} dB</label>
                <input
                  type="range"
                  min={-30}
                  max={0}
                  value={masterVol}
                  onChange={(e) => setMasterVol(parseInt(e.target.value))}
                />
              </div>

              <div className="ml-4 flex items-center gap-2">
                <label className="text-xs">화음 두께 {thickness}</label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={thickness}
                  onChange={(e) => setThickness(parseInt(e.target.value))}
                />
              </div>

              <div className="ml-4 flex items-center gap-2">
                <label className="text-xs">악기</label>
                <select
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                >
                  {['piano','strings','brass','woodwind','percussion'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chord lane */}
            <div className="mt-4 h-14 w-full overflow-hidden rounded-xl bg-neutral-900/60">
              <div className="relative h-full w-full">
                {chords.map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    title={`${c.name}`}
                    className="absolute top-0 bottom-0 text-xs flex items-center justify-center"
                    style={{
                      left: `${(c.start / Math.max(1, chords.at(-1)?.start! + chords.at(-1)?.duration!)) * 100}%`,
                      width: `${(c.duration / Math.max(1, chords.at(-1)?.start! + chords.at(-1)?.duration!)) * 100}%`,
                      background: "rgba(255,255,255,0.06)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >{c.name}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Ingest */}
          <div className="rounded-2xl border border-neutral-800 p-4">
            <h2 className="text-lg font-medium">입력</h2>
            <p className="text-xs text-neutral-400">마이크 녹음 또는 파일 업로드 → /api/piano/ 로 전송</p>

            <div className="mt-3 flex flex-col gap-2">
              {!recOn ? (
                <button className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={startRec} disabled={busy}>
                  녹음 시작
                </button>
              ) : (
                <button className="px-3 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700" onClick={stopRec}>
                  녹음 종료·업로드
                </button>
              )}

              <input ref={fileInputRef} type="file" accept="audio/*" onChange={onSelectFile} className="text-xs" />

              <button className="px-3 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600" onClick={loadMock}>
                Mock JSON 재생
              </button>
            </div>

            <p className="mt-2 text-xs text-neutral-400">상태: {busy ? `처리중·${progress}` : progress || "대기"}</p>
          </div>
        </div>

        {/* Gesture mock */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="rounded-xl border border-neutral-700 px-3 py-2 hover:bg-neutral-800" onClick={() => onGesture("orchestra")}>양손 주먹 = 시작/정지</button>
          <button className="rounded-xl border border-neutral-700 px-3 py-2 hover:bg-neutral-800" onClick={() => onGesture("tempoTap")}>왼손 주먹(탭) = 템포+</button>
          <button className="rounded-xl border border-neutral-700 px-3 py-2 hover:bg-neutral-800" onClick={() => onGesture("volumePalm", { delta: 2 })}>왼손 손바닥 = 볼륨↑</button>
          <button className="rounded-xl border border-neutral-700 px-3 py-2 hover:bg-neutral-800" onClick={() => onGesture("volumePalm", { delta: -2 })}>왼손 손바닥 = 볼륨↓</button>
          <button className="rounded-xl border border-neutral-700 px-3 py-2 hover:bg-neutral-800" onClick={() => onGesture("nextInstrument")}>오른손 휙 = 악기 변경</button>
        </div>

        {/* Dev helpers */}
        <div className="mt-6 text-xs text-neutral-400">
          <p>폴더 제안: <code>components/piano/</code>, <code>hooks/useTonePlayer.ts</code>, <code>app/piano/page.tsx</code></p>
          <p>주의: 샘플러 음원 미포함. 배포시 CDN 음원 또는 WebAudio API 기본 파형 사용.</p>
        </div>
      </div>
    </div>
  );
}
