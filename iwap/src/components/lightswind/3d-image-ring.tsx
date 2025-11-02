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
  const justDragged = useRef(false);

  const lastTappedIndex = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);

  const parsedImages = useMemo(
    () =>
      images.map((i) =>
        typeof i === "string"
          ? { src: i }
          : { src: i.src, link: i.link, text: i.text, description: i.description }
      ),
    [images]
  );

  const angle = parsedImages.length ? 360 / parsedImages.length : 0;
  const FRONT_THRESHOLD = 180;

  const getFacingState = (index: number, baseRotation: number) => {
    const rotation = index * -angle;
    const effective = (baseRotation + rotation) % 360;
    const normalized = (effective + 360) % 360;
    const distance = normalized > 180 ? 360 - normalized : normalized;

    return {
      rotation,
      distance,
      isFacing: distance <= FRONT_THRESHOLD,
    };
  };

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

  const rotateToIndex = (index: number) => {
    const target = -index * angle;
    const current = ((currentRotationY.current % 360) + 360) % 360;
    let delta = target - current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    animate(rotationY, currentRotationY.current + delta, {
      duration: 0.7,
      ease: easeOut,
      onUpdate: (v) => (currentRotationY.current = v),
    });
  };

  const handleImageClick = (index: number) => {
    if (isDragging.current || justDragged.current || moved.current) return;
    const item = parsedImages[index];
    const now = Date.now();
    const isMobile = window.innerWidth <= mobileBreakpoint;

    const { isFacing } = getFacingState(index, currentRotationY.current);

    if (!isFacing) {
      rotateToIndex(index);
      setHoverIndex(index);
      return;
    }

    if (isMobile) {
      if (lastTappedIndex.current === index && now - lastTapTime.current < 1000) {
        if (item?.link) router.push(item.link);
        lastTappedIndex.current = null;
      } else {
        setHoverIndex(index);
        lastTappedIndex.current = index;
        lastTapTime.current = now;
      }
    } else {
      if (hoverIndex === index) {
        if (item?.link) router.push(item.link);
      } else {
        setHoverIndex(index);
      }
    }
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
    const p = "touches" in e ? e.touches[0] : (e as MouseEvent);
    const dx = p.clientX - startX.current;
    if ("touches" in e) e.preventDefault();
    if (!isDragging.current && Math.abs(dx) > 6) isDragging.current = true;
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

  return (
    <div
      className="w-full h-full overflow-hidden select-none relative flex justify-center items-center"
      style={{
        backgroundColor,
        transform: `scale(${currentScale})`,
        transformStyle: "flat",
        isolation: "isolate",
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div
        style={{
          perspective: `${perspective}px`,
          width,
          height,
          position: "relative",
        }}
      >
        <motion.div
          ref={ringRef}
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            rotateY: rotationY,
          }}
        >
          <AnimatePresence>
            {showImages &&
              parsedImages.map((img, index) => {
                const { rotation, distance, isFacing } = getFacingState(
                  index,
                  currentRotation
                );
                const transformOrigin = `50% 50% ${imageDistance * currentScale}px`;
                const zIndex = 1000 - Math.round(distance);

                return (
                  <motion.div
                    key={index}
                    onClick={() => handleImageClick(index)}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                    className={cn(
                      "absolute flex items-center justify-center w-full h-full overflow-hidden text-white cursor-pointer"
                    )}
                    style={{
                      transformStyle: "preserve-3d",
                      rotateY: rotation,
                      z: -imageDistance * currentScale,
                      transformOrigin,
                      zIndex,
                      backgroundImage: `url(${img.src})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backfaceVisibility: "hidden",
                      pointerEvents: isFacing ? "auto" : "none",
                    }}
                    aria-hidden={!isFacing}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      delay: index * staggerDelay,
                      duration: animationDuration,
                      ease: easeOut,
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 flex flex-col justify-center items-center bg-black/40 backdrop-blur-sm text-center px-3"
                      style={{ pointerEvents: "none" }}
                      animate={{
                        opacity: hoverIndex === index ? 1 : 0,
                        y: hoverIndex === index ? 0 : 10,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {img.text && (
                        <p className="text-[10px] md:text-[28px] font-semibold mb-1 pointer-events-none">
                          {img.text}
                        </p>
                      )}
                      {img.description && (
                        <p className="text-[6px] md:text-[9px] pointer-events-none">
                          {img.description}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

