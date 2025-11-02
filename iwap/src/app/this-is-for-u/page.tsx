"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  easeOut,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ThreeDImageRing({
  images = [],
  width = 300,
  height = width * 1.33,
  perspective = 2000,
  imageDistance = 500,
  initialRotation = 180,
  animationDuration = 1.5,
  staggerDelay = 0.1,
  backgroundColor = "#fff",
  draggable = true,
  ease = "easeOut",
  mobileBreakpoint = 768,
  mobileScaleFactor = 0.8,
  desktopScale = 1,
}: {
  images?: any[];
  width?: number;
  height?: number;
  perspective?: number;
  imageDistance?: number;
  initialRotation?: number;
  animationDuration?: number;
  staggerDelay?: number;
  backgroundColor?: string;
  draggable?: boolean;
  ease?: string;
  mobileBreakpoint?: number;
  mobileScaleFactor?: number;
  desktopScale?: number;
}) {
  const router = useRouter();
  const ringRef = useRef<HTMLDivElement>(null);
  const rotationY = useMotionValue(initialRotation);
  const currentRotationY = useRef(initialRotation);
  const [currentRotation, setCurrentRotation] = useState(initialRotation);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);

  const startX = useRef(0);
  const isDragging = useRef(false);
  const moved = useRef(false);
  const velocity = useRef(0);
  const justDragged = useRef(false);

  const parsedImages = useMemo(() => {
    return images.map((i) =>
      typeof i === "string"
        ? { src: i }
        : { src: i.src, link: i.link, text: i.text, description: i.description }
    );
  }, [images]);

  const angle = parsedImages.length ? 360 / parsedImages.length : 0;

  useEffect(() => {
    const unsub = rotationY.on("change", (v) => {
      currentRotationY.current = v;
      setCurrentRotation(v);
    });
    return () => unsub();
  }, [rotationY]);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      setCurrentScale(vw <= mobileBreakpoint ? mobileScaleFactor : desktopScale);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint, mobileScaleFactor, desktopScale]);

  useEffect(() => setShowImages(true), []);

  const handleImageClick = (index: number) => {
    if (justDragged.current) return;
    const link = parsedImages[index].link;
    if (link) router.push(link);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggable) return;
    isDragging.current = false;
    moved.current = false;
    justDragged.current = false;
    const p = "touches" in e ? e.touches[0] : e;
    startX.current = p.clientX;
    rotationY.stop();
    document.addEventListener("mousemove", handleDrag as any);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDrag as any, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    const p =
      "touches" in e
        ? (e as TouchEvent).touches[0]
        : (e as MouseEvent);
    const dx = p.clientX - startX.current;
    if ("touches" in e) e.preventDefault();
    if (!isDragging.current && Math.abs(dx) > 8) isDragging.current = true;
    if (isDragging.current) {
      moved.current = true;
      rotationY.set(currentRotationY.current - dx * 0.5);
      startX.current = p.clientX;
    }
  };

  const handleDragEnd = () => {
    document.removeEventListener("mousemove", handleDrag as any);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDrag as any);
    document.removeEventListener("touchend", handleDragEnd);
    if (moved.current) justDragged.current = true;
    isDragging.current = false;
    moved.current = false;
  };

    const pageBackgroundStyle = {
    backgroundImage: "url('/images/this-is-for-u_background.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)] overflow-hidden style={pageBackgroundStyle}">
      <FullScreenView
        title="Th!s !s for u"
        subtitle="함수로 하트 그리기"
        goBack={true}
        onPrev={handlePrev}
        onNext={handleNext}
        backgroundUrl="/images/this-is-for-u_background.jpg"
        titleClassName="translate-y-[60px] translate-x-[9px] md:translate-x-0 md:translate-y-0 font-semibold"
        subtitleClassName="translate-y-[60px] translate-x-[10px] md:translate-x-0 md:translate-y-0 font-semilight"
        closeButtonClassName="translate-y-[60px] md:translate-y-0"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/95 to-black"></div>
        <div className="relative z-20 md:mt-20 w-[85vw] max-w-[1501px] h-[45vh] md:h-[65vh] max-h-[700px] bg-white flex flex-col items-center justify-center">
          <div ref={ref} className="w-full flex-grow min-h-0">
            {debouncedSize.width > 0 && debouncedSize.height > 0 && (
              <Plot
                data={selectedPlot.data}
                layout={plotLayout}
                config={{ responsive: true }}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
          {index === 2 && (
            <div className="w-[80%] max-w-xl my-4 flex-shrink-0">
              <input
                type="range" min="-10" max="10" step="0.1" value={a}
                onChange={(e) => setA(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          )}
        </div>
      </FullScreenView>
    </div>
  );
}
