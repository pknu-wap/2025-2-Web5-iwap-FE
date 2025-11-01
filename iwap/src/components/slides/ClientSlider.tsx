"use client";

import dynamic from "next/dynamic";
const HeroSlider = dynamic(() => import("@/components/slides/HeroSlider"), { ssr: false });

export default function ClientSlider() {
  return <HeroSlider />;
}