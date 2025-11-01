"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, easeOut } from "framer-motion";
import { cn } from "@/lib/utils";
import { animate } from "framer-motion";

export type ThreeDImageInput =
  | string
  | {
      src: string;
      link?: string;
      text?: string;
      description?: string;
      [key: string]: unknown;
    };

export interface ThreeDImageRingProps {
  images?: ThreeDImageInput[];
  width?: number;
  height?: number;
  perspective?: number;
  imageDistance?: number;
  initialRotation?: number;
  animationDuration?: number;
  staggerDelay?: number;
  hoverOpacity?: number;
  containerClassName?: string;
  ringClassName?: string;
  imageClassName?: string;
  backgroundColor?: string;
  draggable?: boolean;
  ease?: string;
  mobileBreakpoint?: number;
  mobileScaleFactor?: number;
  desktopScale?: number;
  focusedScale?: number;
  inertiaPower?: number;
  inertiaTimeConstant?: number;
  inertiaVelocityMultiplier?: number;
}

export function ThreeDImageRing({
  images = [],
  width = 300,
  height = width * 1.33,
  perspective = 2000,
  imageDistance = 500,
  initialRotation = 180,
  animationDuration = 1.5,
  staggerDelay = 0.1,
  hoverOpacity = 0.5,
  containerClassName,
  ringClassName,
  imageClassName,
  backgroundColor,
  draggable = true,
  ease = "easeOut",
  mobileBreakpoint = 768,
  mobileScaleFactor = 0.8,
  desktopScale = 1,
  focusedScale = 1,
  inertiaPower = 0.8,
  inertiaTimeConstant = 300,
  inertiaVelocityMultiplier = 20,
}: ThreeDImageRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  type ParsedImage = {
    src: string;
    link?: string;
    title?: string;
    description?: string;
  };

  const rotationY = useMotionValue(initialRotation);
  const startX = useRef<number>(0);
  const currentRotationY = useRef<number>(initialRotation);
  const isDragging = useRef<boolean>(false);
  const velocity = useRef<number>(0);
  const justDragged = useRef<boolean>(false);
  const hasAnimatedIn = useRef<boolean>(false);

  const [currentScale, setCurrentScale] = useState(1);
  const [showImages, setShowImages] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const parsedImages = useMemo(() => {
    const toString = (value: unknown) => (typeof value === "string" ? value : undefined);

    return images
      .map<ParsedImage | null>((item) => {
        if (typeof item === "string") {
          return item.length > 0 ? { src: item } : null;
        }

        const src = toString(item.src);
        if (!src) return null;

        const link = toString(item.link);
        const title = toString((item as { title?: string }).title) ?? toString(item.text);
        const description = toString(item.description);

        return {
          src,
          link: link ?? undefined,
          title: title ?? undefined,
          description: description ?? undefined,
        };
      })
      .filter((img): img is ParsedImage => img !== null);
  }, [images]);

  const angle = useMemo(
    () => (parsedImages.length > 0 ? 360 / parsedImages.length : 0),
    [parsedImages.length]
  );

  const focusOpacity = useMemo(() => {
    const base = typeof hoverOpacity === "number" ? Math.min(Math.max(hoverOpacity, 0), 1) : 0.5;
    const scaleAdjustment = Math.min(Math.max(focusedScale, 1), 1.5) - 1;
    const blendStrength = Math.min(1, Math.max(0, 0.7 + scaleAdjustment * 0.2));
    const blended = base + (1 - base) * blendStrength;
    return Math.min(0.97, Math.max(0.6, blended));
  }, [hoverOpacity, focusedScale]);

  const getBgPos = (imageIndex: number, currentRot: number, scale: number) => {
    const scaledImageDistance = imageDistance * scale;
    const effectiveRotation = currentRot - 180 - imageIndex * angle;
    const parallaxOffset = ((effectiveRotation % 360 + 360) % 360) / 360;
    return `${-(parallaxOffset * (scaledImageDistance / 1.5))}px 0px`;
  };

  useEffect(() => {
    const unsubscribe = rotationY.on("change", (latestRotation) => {
      currentRotationY.current = latestRotation;
    });
    return () => unsubscribe();
  }, [rotationY]);

  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const newScale = viewportWidth <= mobileBreakpoint ? mobileScaleFactor : desktopScale;
      setCurrentScale(newScale);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint, mobileScaleFactor, desktopScale]);

  useEffect(() => {
    setShowImages(true);
  }, []);

  useEffect(() => {
    if (showImages && !hasAnimatedIn.current) {
      hasAnimatedIn.current = true;
    }
  }, [showImages]);

  const activeImage = useMemo(
    () => (activeIndex !== null ? parsedImages[activeIndex] ?? null : null),
    [activeIndex, parsedImages]
  );

  const handleImageClick = (index: number) => {
    if (isDragging.current || justDragged.current) return;

    if (activeIndex === index) {
      const item = parsedImages[index];
      if (item?.link) {
        window.open(item.link, "_blank");
      } else {
        setActiveIndex(null);
      }
    } else {
      setActiveIndex(index);
    }
  };

  const handleDragStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (!draggable) return;
    setActiveIndex(null);
    isDragging.current = true;
    justDragged.current = false;
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    startX.current = clientX;
    rotationY.stop();
    velocity.current = 0;
    if (ringRef.current) {
      ringRef.current.style.cursor = "grabbing";
    }
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDrag);
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleDrag = (event: MouseEvent | TouchEvent) => {
    if (!draggable || !isDragging.current) return;

    const clientX =
      "touches" in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const deltaX = clientX - startX.current;

    velocity.current = -deltaX * 0.5;
    rotationY.set(currentRotationY.current + velocity.current);
    startX.current = clientX;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    justDragged.current = true;
    if (ringRef.current) {
      ringRef.current.style.cursor = "grab";
      currentRotationY.current = rotationY.get();
    }

    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDrag);
    document.removeEventListener("touchend", handleDragEnd);

    const initial = rotationY.get();
    const velocityBoost = velocity.current * inertiaVelocityMultiplier;
    const target = initial + velocityBoost;

    animate(initial, target, {
      type: "inertia",
      velocity: velocityBoost,
      power: inertiaPower,
      timeConstant: inertiaTimeConstant,
      restDelta: 0.5,
      modifyTarget: (nextTarget) =>
        angle !== 0 ? Math.round(nextTarget / angle) * angle : nextTarget,
      onUpdate: (latest) => {
        rotationY.set(latest);
      },
    });

    velocity.current = 0;
    requestAnimationFrame(() => {
      justDragged.current = false;
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full overflow-hidden select-none relative", containerClassName)}
      style={{
        backgroundColor,
        transform: `scale(${currentScale})`,
        transformOrigin: "center center",
      }}
      onMouseDown={draggable ? handleDragStart : undefined}
      onTouchStart={draggable ? handleDragStart : undefined}
    >
      <div
        style={{
          perspective: `${perspective}px`,
          width: `${width}px`,
          height: `${height}px`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <motion.div
          ref={ringRef}
          className={cn("w-full h-full absolute", ringClassName)}
          style={{
            transformStyle: "preserve-3d",
            rotateY: rotationY,
            cursor: draggable ? "grab" : "default",
          }}
        >
          <AnimatePresence>
            {showImages &&
              parsedImages.map((imageData, index) => {
                const isActive = activeIndex === index;
                const transformOrigin = `50% 50% ${imageDistance * currentScale}px`;

                return (
                  <motion.div
                    key={index}
                    className={cn("w-full h-full absolute", imageClassName)}
                    onClick={() => handleImageClick(index)}
                    style={{
                      transformStyle: "preserve-3d",
                      backgroundImage: `url(${imageData.src})`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      backfaceVisibility: "hidden",
                      rotateY: index * -angle,
                      z: -imageDistance * currentScale,
                      transformOrigin,
                      backgroundPosition: getBgPos(index, currentRotationY.current, currentScale),
                      zIndex: isActive ? parsedImages.length + 1 : index,
                    }}
                    initial={{ y: 200, opacity: 0, scaleX: 1, scaleY: 1, x: 0 }}
                    animate={{
                      y: 0,
                      opacity: isActive ? 1 : hoverOpacity,
                      scaleX: 1,
                      scaleY: 1,
                      x: 0,
                    }}
                    exit={{ y: 200, opacity: 0, scaleX: 1, scaleY: 1, x: 0 }}
                    transition={{
                      delay: hasAnimatedIn.current ? 0 : index * staggerDelay,
                      duration: hasAnimatedIn.current ? 0.35 : animationDuration,
                      ease: easeOut,
                    }}
                    whileHover={{ opacity: 1, transition: { duration: 0.15 } }}
                  />
                );
              })}
          </AnimatePresence>
        </motion.div>
      </div>
      <AnimatePresence>
        {activeImage && (activeImage.title || activeImage.description) && (
          <motion.div
            key="active-slide-details"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="absolute bottom-6 left-1/2 max-w-[80%] -translate-x-1/2 rounded-xl bg-black/65 px-5 py-4 text-center text-white shadow-lg backdrop-blur-sm"
          >
            {activeImage.title && (
              <p className="text-base font-semibold leading-tight">{activeImage.title}</p>
            )}
            {activeImage.description && (
              <p className="mt-1 text-xs leading-snug text-white/80">{activeImage.description}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThreeDImageRing;
