"use client";

import { useEffect } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

type PianoBackendManagerProps = {
  audioUrl: string | null;
  onMidiEvent: (event: { type: "on" | "off"; note: number }) => void;
  onStatusChange?: (status: string) => void;
};

/**
 * Handles communication with the piano backend and schedules MIDI playback.
 */
export default function PianoBackendManager({
  audioUrl,
  onMidiEvent,
  onStatusChange,
}: PianoBackendManagerProps) {
  useEffect(() => {
    if (!audioUrl) return;

    let isCancelled = false;
    onStatusChange?.("");

    const fetchAndPlayMidi = async () => {
      try {
        const midiRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`
        );
        if (!midiRes.ok) throw new Error("Failed to download MIDI file");

        const midiArray = await midiRes.arrayBuffer();
        const midi = new Midi(midiArray);

        await Tone.start();
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();

        Tone.Transport.cancel();
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        midi.tracks.forEach((track) => {
          track.notes.forEach((note) => {
            const midiNum = note.midi;
            const start = note.time;
            const duration = Math.max(note.duration, 0.05);

            Tone.Transport.schedule((time) => {
              if (isCancelled) return;
              synth.triggerAttackRelease(
                note.name,
                duration,
                time,
                note.velocity
              );
              onMidiEvent({ type: "on", note: midiNum });
              Tone.Transport.scheduleOnce(() => {
                onMidiEvent({ type: "off", note: midiNum });
              }, start + duration);
            }, start);
          });
        });

        if (!isCancelled) {
          Tone.Transport.start("+0.05");
        }
      } catch (err) {
        console.error("MIDI playback failed:", err);
        if (!isCancelled) {
          onStatusChange?.("MIDI 재생 실패");
        }
      }
    };

    const sendAudioToBackend = async () => {
      try {
        const res = await fetch(audioUrl);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append("voice", blob, "voice.mp3");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadRes.ok) throw new Error("Audio upload failed");

        await fetchAndPlayMidi();
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          onStatusChange?.("오류 발생");
        }
      }
    };

    sendAudioToBackend();

    return () => {
      isCancelled = true;
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, [audioUrl, onMidiEvent, onStatusChange]);

  return null;
}
