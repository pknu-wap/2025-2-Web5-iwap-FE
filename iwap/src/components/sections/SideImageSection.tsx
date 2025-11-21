"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants, easeInOut } from "framer-motion";

type Side = "left" | "right";

interface SideImageSectionProps {
  id?: string;
  imageSrc: string;
  imageAlt: string;
  side?: Side;
  heading: string;
  badgeText?: string;
  badgeAlign?: "left" | "right";
  textAlign?: "left" | "right";
  className?: string;
  // Optional overlay content that appears on top of the image
  imageOverlay?: React.ReactNode;
  // Position of the overlay within the image
  overlayPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  // Extra classes for the overlay content box (inner wrapper)
  overlayClassName?: string;
  // Additional overlays pinned to vertical center left/right
  imageOverlayLeft?: React.ReactNode;
  imageOverlayRight?: React.ReactNode;
  overlayLeftClassName?: string;
  overlayRightClassName?: string;
  imageWrapperClassName?: string;
  imageClassName?: string;
  children: React.ReactNode;
}

export default function SideImageSection({
  id,
  imageSrc,
  imageAlt,
  side = "left",
  heading,
  badgeText = "Vision",
  badgeAlign,
  textAlign,
  className = "",
  imageOverlay,
  overlayPosition = "bottom-left",
  overlayClassName = "",
  imageOverlayLeft,
  imageOverlayRight,
  overlayLeftClassName = "",
  overlayRightClassName = "",
  imageWrapperClassName = "",
  imageClassName = "object-cover",
  children,
}: SideImageSectionProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)") : null;
    const update = () => setIsMobile(Boolean(mq?.matches));
    update();
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, []);

  const isRight = side === "right";
  const badgeOptions = ["Vision", "Hearing", "Touch"] as const;
  const effectiveAlign: "left" | "right" = textAlign ?? (isRight ? "right" : "left");
  const alignClass = effectiveAlign === "right" ? "text-right md:text-right" : "text-left md:text-left";
  const effectiveBadgeAlign: "left" | "right" = badgeAlign ?? effectiveAlign;
  const badgeWrapperClass = effectiveBadgeAlign === "right" ? "flex justify-end" : "flex justify-start";
  const overlayPosClass = {
    "top-left": "items-start justify-start p-3",
    "top-right": "items-start justify-end p-3",
    "bottom-left": "items-end justify-start p-3",
    "bottom-right": "items-end justify-end p-3",
    center: "items-center justify-center p-3",
  }[overlayPosition];

  const desktopImageVariants: Variants = {
    hidden: { x: isRight ? -200 : 200, scale: 1, opacity: 1 },
    show: { x: 0, scale: 1, opacity: 1, transition: { duration: 0.9, ease: easeInOut, delay: 0.2 } },
  };
  const desktopTextVariants: Variants = {
    hidden: { x: isRight ? 140 : -140, opacity: 0, scale: 1 },
    show: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.8, ease: easeInOut, delay: 0.3 } },
  };
  const mobileImageVariants: Variants = {
    hidden: { x: 0, opacity: 0, scale: 1 },
    show: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: easeInOut, delay: 0.1 } },
  };
  const mobileTextVariants: Variants = {
    hidden: { x: 0, opacity: 0, scale: 1 },
    show: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: easeInOut, delay: 0.15 } },
  };
  const imageVariants = isMobile ? mobileImageVariants : desktopImageVariants;
  const textVariants = isMobile ? mobileTextVariants : desktopTextVariants;

  return (
    <section id={id} className={`w-full flex items-center py-20 ${className}`}>
      <div className="w-full max-w-7xl mx-auto py-2">
        <motion.div
          className={`flex flex-col items-start gap-5 md:gap-10 translate-x-[30px] sm:translate-x-4 md:translate-x-0 ${isRight ? "md:flex-row-reverse" : "md:flex-row"}`}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div
            variants={imageVariants}
            className={`relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-none md:w-[520px] h-[200px] sm:h-[240px] md:h-[400px] flex-shrink-0 overflow-hidden rounded-[10px] ${imageWrapperClassName}`}
          >
            <img src={imageSrc} alt={imageAlt} className={`w-full h-full ${imageClassName}`} />
            {imageOverlay && (
              <div className={`absolute inset-0 flex ${overlayPosClass}`}>
                <div
                  className={`flex items-center gap-3 text-white font-normal text-[14px] sm:text-[18px] md:text-[22px] px-3 sm:px-4 py-2 ${overlayClassName}`}
                  style={{ letterSpacing: "-1.4px" }}
                >
                  <span>{imageOverlay}</span>
                  <img src="/icons/rightrvector.svg" alt="" className="w-[96px] h-[22px] sm:w-[130px] sm:h-[28px] md:w-[160px] md:h-[32px]" />
                </div>
              </div>
            )}
            {imageOverlayLeft && (
              <div className="absolute inset-y-0 left-0 flex items-center justify-end">
                <div className={`rotate-90 font-medium text-[36px] md:text-[64px] !text-white/50 ${overlayLeftClassName}`}>
                  {imageOverlayLeft}
                </div>
              </div>
            )}
            {imageOverlayRight && (
              <div className="absolute inset-y-0 right-0 flex items-end justify-end">
                <div className={`text-white font-semibold text-[72px] sm:text-[84px] md:text-[96px] translate-y-8 md:translate-y-10 tracking-[-2.4px] ${overlayRightClassName}`}>
                  {imageOverlayRight}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={textVariants}
            className={`w-full md:flex-1 md:min-w-[620px] md:max-w-[900px] ${alignClass} text-[#000000] text-[18px] sm:text-[20px] md:text-[22px] leading-relaxed`}
          >
            <div className={`${badgeWrapperClass} mb-6`}>
              <div className="flex gap-2 sm:gap-3 text-[11px] sm:text-[12px] md:text-[14px]">
                {badgeOptions.map((label) => {
                  const isActive = label.toLowerCase() === badgeText.toLowerCase();
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center justify-center w-[80px] h-[30px] sm:w-[96px] sm:h-[36px] md:w-[110px] md:h-[40px] rounded-[5px] border bg-transparent ${
                        isActive ? "border-white" : "border-[#FFFFFF4D]"
                      }`}
                    >
                      <span className={isActive ? "font-semibold" : "font-semibold !text-[#FFFFFF4D]"}>{label.slice(0, 1)}</span>
                      <span className={isActive ? "font-light" : "font-light !text-[#FFFFFF4D]"}>{label.slice(1)}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <span className="font-semibold text-[22px] sm:text-[24px] md:text-[28px] block mb-2">{heading}</span>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
