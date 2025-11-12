"use client";

import React from "react";
import { motion } from "framer-motion";

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
  children: React.ReactNode;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

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
  children,
}: SideImageSectionProps) {
  const isRight = side === "right";
  const firstChar = badgeText.slice(0, 1);
  const restText = badgeText.slice(1);
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

  return (
    <section id={id} className={`w-full min-h-screen snap-start flex items-center px-6 md:px-8 scroll-mt-24 ${className}`}>
      <div className="w-full max-w-7xl mx-auto py-16">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
          <div className={`flex flex-col items-start gap-8 md:gap-10 ${isRight ? "md:flex-row-reverse" : "md:flex-row"}`}>
          <div className="relative w-full md:w-[520px] md:h-[400px] flex-shrink-0">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full h-auto md:h-full object-cover"
            />
            {imageOverlay && (
              <div className={`absolute inset-0 flex ${overlayPosClass}`}>
                <div className={`text-white font-Medium text-[24px] px-4 py-2 ${overlayClassName}`}>
                  {imageOverlay}
                </div>
              </div>
            )}
            {imageOverlayLeft && (
              <div className="absolute inset-y-0 left-0 flex items-center justify-end">
                <div className={`text-white/50 rotate-90 font-Medium text-[64px] ${overlayLeftClassName}`}>
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
          </div>
            <motion.div
            variants={item}
            className={`${alignClass} text-[#000000] text-[24px]`}
          >
            <div className={`${badgeWrapperClass} mb-6`}>
              <span className="inline-flex items-center justify-center w-[93px] h-[37px] rounded-[5px] border border-black">
                <span className="font-semibold">{firstChar}</span>
                <span className="font-light">{restText}</span>
              </span>
            </div>
            <span className="font-semibold text-[30px] block mb-2">{heading}</span>
            {children}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
