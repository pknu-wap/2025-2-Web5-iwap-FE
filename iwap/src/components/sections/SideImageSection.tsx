"use client";

import React from "react";
import { motion, type Variants, cubicBezier, easeInOut } from "framer-motion";

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
  children,
}: SideImageSectionProps) {
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

  const imageVariants: Variants = {
    hidden: { x: isRight ? -200 : 200, scale: 1, opacity: 1 },
    show: {
      x: 0,
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3, ease: easeInOut, delay: 0.25 },
    },
  };

  const textVariants: Variants = {
    hidden: { x: isRight ? 140 : -140, opacity: 0, scale: 1 },
    show: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeInOut, delay: 0.25 } },
  };

  return (
    <section id={id} className={`w-full flex items-center py-20 ${className}`}>
      <div className="w-full max-w-7xl mx-auto py-2">
        <motion.div
          className={`flex flex-col items-start gap-8 md:gap-10 ${isRight ? "md:flex-row-reverse" : "md:flex-row"}`}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div
            variants={imageVariants}
            className={`relative w-full md:w-[520px] md:h-[400px] flex-shrink-0 overflow-hidden rounded-[10px] ${imageWrapperClassName}`}
          >
            <img src={imageSrc} alt={imageAlt} className="w-full h-auto md:h-full object-cover" />
            {imageOverlay && (
              <div className={`absolute inset-0 flex ${overlayPosClass}`}>
                <div
                  className={`flex items-center gap-3 text-white font-normal text-[24px] px-4 py-2 ${overlayClassName}`}
                  style={{ letterSpacing: "-1.6px" }}
                >
                  <span>{imageOverlay}</span>
                  <img src="/icons/rightrvector.svg" alt="" className="w-[160px] h-[32px]" />
                </div>
              </div>
            )}
            {imageOverlayLeft && (
              <div className="absolute inset-y-0 left-0 flex items-center justify-end">
                <div className={`rotate-90 font-medium text-[64px] !text-white/50 ${overlayLeftClassName}`}>
                  {imageOverlayLeft}
                </div>
              </div>
            )}
            {imageOverlayRight && (
              <div className="absolute inset-y-0 right-0 flex items-end justify-end">
                <div className={`text-white font-semibold text-[96px] translate-y-10 tracking-[-2.4px] ${overlayRightClassName}`}>
                  {imageOverlayRight}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={textVariants}
            className={`w-full md:flex-1 md:min-w-[620px] md:max-w-[900px] ${alignClass} text-[#000000] text-[24px] leading-relaxed`}
          >
            <div className={`${badgeWrapperClass} mb-6`}>
              <div className="flex gap-3">
                {badgeOptions.map((label) => {
                  const isActive = label.toLowerCase() === badgeText.toLowerCase();
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center justify-center w-[110px] h-[40px] rounded-[5px] border bg-transparent ${
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

            <span className="font-semibold text-[30px] block mb-2">{heading}</span>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
