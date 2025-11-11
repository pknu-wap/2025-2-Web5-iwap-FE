"use client";

import dynamic from "next/dynamic";

const GraffitiClient = dynamic(() => import("@/components/graffiti/GraffitiClient"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full min-h-[calc(100dvh-64px)] flex items-center justify-center bg-stone-900 text-white">
      Loading…
    </div>
  ),
});

export default function GraffitiPage() {
  return <GraffitiClient />;
}
