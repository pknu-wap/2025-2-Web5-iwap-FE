// src/app/piano/hooks/useGestureSocket.ts
"use client";

import { useEffect } from "react";

export default function useGestureSocket(
  onGesture: (type: string, payload?: any) => void
) {
  useEffect(() => {
    const ws = new WebSocket("wss://pukyong-iwap.duckdns.org/ws/gesture");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.gesture) onGesture(data.gesture, data.payload);
      } catch (e) {
        console.error("invalid gesture msg", e);
      }
    };

    ws.onerror = (e) => console.error("WS error", e);

    return () => ws.close();
  }, [onGesture]);
}