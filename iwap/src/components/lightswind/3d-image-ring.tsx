"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, easeOut } from "framer-motion";
import { cn } from "@/lib/utils"; // Tailwind className helper
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
  /** Array of image URLs to display in the ring */
  images?: ThreeDImageInput[];
  /** Container width in pixels (will be scaled) */
  width?: number;
  /** Container height in pixels (defaults to width * 1.33) */
  height?: number;
  /** 3D perspective value */
  perspective?: number;
  /** Distance of images from center (z-depth) */
  imageDistance?: number;
  /** Initial rotation of the ring */
  initialRotation?: number;
  /** Animation duration for entrance */
  animationDuration?: number;
  /** Stagger delay between images */
  staggerDelay?: number;
  /** Hover opacity for non-hovered images */
  hoverOpacity?: number;
  /** Custom container className */
  containerClassName?: string;
  /** Custom ring className */
  ringClassName?: string;
  /** Custom image className */
  imageClassName?: string;
  /** Background color of the stage */
  backgroundColor?: string;
  /** Enable/disable drag functionality */
  draggable?: boolean;
  /** Animation ease for entrance */
  ease?: string;
  /** Breakpoint for mobile responsiveness (e.g., 768 for iPad mini) */
  mobileBreakpoint?: number;
  /** Scale factor for mobile (e.g., 0.7 for 70% size) */
  mobileScaleFactor?: number;
  /** Scale factor for desktop and larger viewports */
  desktopScale?: number;
  /** Scale factor applied to the image when it is activated via click */
  focusedScale?: number;
  /** Power for the drag end inertia animation (higher means faster stop) */
  inertiaPower?: number;
  /** Time constant for the drag end inertia animation (duration of deceleration in ms) */
  inertiaTimeConstant?: number;
  /** Multiplier for initial velocity when drag ends (influences initial "spin") */
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
  focusedScale = 2,
  inertiaPower = 0.8, // Default power for inertia
  inertiaTimeConstant = 300, // Default time constant for inertia
  inertiaVelocityMultiplier = 20, // Default multiplier for initial spin
}: ThreeDImageRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const rotationY = useMotionValue(initialRotation);
  const startX = useRef<number>(0);
  const currentRotationY = useRef<number>(initialRotation);
  const isDragging = useRef<boolean>(false);
  const velocity = useRef<number>(0); // To track drag velocity
  const hasAnimatedIn = useRef<boolean>(false);

  const [currentScale, setCurrentScale] = useState(1);
  const [showImages, setShowImages] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const normalizedImages = useMemo(
    () =>
      images
        .map((item) =>
          typeof item === "string" ? item : typeof item.src === "string" ? item.src : ""
        )
        .filter((src): src is string => src.length > 0),
    [images]
  );

  const angle = useMemo(
    () => (normalizedImages.length > 0 ? 360 / normalizedImages.length : 0),
    [normalizedImages.length]
  );

  const getBgPos = (imageIndex: number, currentRot: number, scale: number) => {
    const scaledImageDistance = imageDistance * scale;
    const effectiveRotation = currentRot - 180 - imageIndex * angle;
    const parallaxOffset = ((effectiveRotation % 360 + 360) % 360) / 360;
    return `${-(parallaxOffset * (scaledImageDistance / 1.5))}px 0px`;
  };

  useEffect(() => {
    const unsubscribe = rotationY.on("change", (latestRotation) => {
      if (ringRef.current) {
        Array.from(ringRef.current.children).forEach((imgElement, i) => {
          (imgElement as HTMLElement).style.backgroundPosition = getBgPos(
            i,
            latestRotation,
            currentScale
          );
        });
      }
      currentRotationY.current = latestRotation;
    });
    return () => unsubscribe();
  }, [rotationY, normalizedImages.length, imageDistance, currentScale, angle]);

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

  const rotateToIndex = useCallback(
    (index: number) => {
      if (angle === 0) return;
      const current = rotationY.get();
      const target = initialRotation + index * angle;
      let delta = target - current;
      delta = ((delta + 540) % 360) - 180; // ensure shortest rotation path
      const finalTarget = current + delta;

      animate(rotationY, finalTarget, {
        duration: 0.65,
        ease: easeOut,
      });
    },
    [angle, initialRotation, rotationY]
  );

  const handleImageClick = (index: number) => {
    if (isDragging.current) return;
    setActiveIndex((prev) => {
      const next = prev === index ? null : index;
      if (next !== null) {
        rotateToIndex(next);
      }
      return next;
    });
  };

  const handleDragStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (!draggable) return;
    setActiveIndex(null);
    isDragging.current = true;
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    startX.current = clientX;
    // Stop any ongoing animation instantly when drag starts
    rotationY.stop();
    velocity.current = 0; // Reset velocity
    if (ringRef.current) {
      (ringRef.current as HTMLElement).style.cursor = "grabbing";
    }
    // Attach global move and end listeners to document when dragging starts
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDrag);
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleDrag = (event: MouseEvent | TouchEvent) => {
    // Only proceed if dragging is active
    if (!draggable || !isDragging.current) return;

    const clientX = "touches" in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const deltaX = clientX - startX.current;

    // Update velocity based on deltaX
    velocity.current = -deltaX * 0.5; // Factor of 0.5 to control sensitivity

    rotationY.set(currentRotationY.current + velocity.current);

    startX.current = clientX;
  };

const handleDragEnd = () => {
  isDragging.current = false;
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

  // Animate with inertia manually using `animate()`
  animate(initial, target, {
    type: "inertia",
    velocity: velocityBoost,
    power: inertiaPower,
    timeConstant: inertiaTimeConstant,
    restDelta: 0.5,
    modifyTarget: (target) =>
      angle !== 0 ? Math.round(target / angle) * angle : target,
    onUpdate: (latest) => {
      rotationY.set(latest);
    },
  });

  velocity.current = 0;
};

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full overflow-hidden select-none relative",
        containerClassName
      )}
      style={{
        backgroundColor,
        transform: `scale(${currentScale})`,
        transformOrigin: "center center",
      }}
      // Attach initial drag start listeners only
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
          className={cn(
            "w-full h-full absolute",
            ringClassName
          )}
          style={{
            transformStyle: "preserve-3d",
            rotateY: rotationY,
            cursor: draggable ? "grab" : "default",
          }}
        >
          <AnimatePresence>
            {showImages &&
              normalizedImages.map((imageUrl, index) => {
                const isActive = activeIndex === index;
                const transformOrigin = `${isActive ? 45 : 50}% 50% ${imageDistance * currentScale}px`;
                const widthDelta = width * (focusedScale - 1);
                let activeOffset = 0;

                if (activeIndex !== null) {
                  const length = normalizedImages.length;
                  const relative = (index - activeIndex + length) % length;

                  if (relative === 0) {
                    activeOffset = widthDelta / 2;
                  } else if (relative === 1) {
                    activeOffset = widthDelta;
                  } else if (relative === length - 1) {
                    activeOffset = -widthDelta / 2;
                  }
                }

                return (
                  <motion.div
                    key={index}
                    className={cn(
                      "w-full h-full absolute",
                      imageClassName
                    )}
                    style={{
                      transformStyle: "preserve-3d",
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      backfaceVisibility: "hidden",
                      rotateY: index * -angle,
                      z: -imageDistance * currentScale,
                      transformOrigin,
                      backgroundPosition: getBgPos(index, currentRotationY.current, currentScale),
                      zIndex: isActive ? normalizedImages.length + 1 : index,
                      translateZ: isActive ? 60 * currentScale : 0,
                    }}
                    initial={{ y: 200, opacity: 0, scaleX: 1, scaleY: 1, x: 0 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      scaleX: isActive ? focusedScale : 1,
                      scaleY: 1,
                      x: activeOffset,
                    }}
                    exit={{ y: 200, opacity: 0, scaleX: 1, scaleY: 1, x: 0 }}
                    transition={{
                      delay: hasAnimatedIn.current ? 0 : index * staggerDelay,
                      duration: hasAnimatedIn.current ? 0.35 : animationDuration,
                      ease: easeOut, // Apply ease for entrance animation
                    }}
                    whileHover={{ opacity: 1, transition: { duration: 0.15 } }}
                    onClick={() => handleImageClick(index)}
                    onHoverStart={() => {
                      // Prevent hover effects while dragging
                      if (isDragging.current || activeIndex !== null) return;
                      if (ringRef.current) {
                        Array.from(ringRef.current.children).forEach((imgEl, i) => {
                          if (i !== index) {
                            (imgEl as HTMLElement).style.opacity = `${hoverOpacity}`;
                          }
                        });
                      }
                    }}
                    onHoverEnd={() => {
                      // Prevent hover effects while dragging
                      if (isDragging.current || activeIndex !== null) return;
                      if (ringRef.current) {
                        Array.from(ringRef.current.children).forEach((imgEl) => {
                          (imgEl as HTMLElement).style.opacity = `1`;
                        });
                      }
                    }}
                  />
                );
              })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default ThreeDImageRing;
