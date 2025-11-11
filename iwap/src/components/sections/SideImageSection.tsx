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
  children,
}: SideImageSectionProps) {
  const isRight = side === "right";
  const firstChar = badgeText.slice(0, 1);
  const restText = badgeText.slice(1);
  const effectiveAlign: "left" | "right" = textAlign ?? (isRight ? "right" : "left");
  const alignClass = effectiveAlign === "right" ? "text-right md:text-right" : "text-left md:text-left";
  const effectiveBadgeAlign: "left" | "right" = badgeAlign ?? effectiveAlign;
  const badgeWrapperClass = effectiveBadgeAlign === "right" ? "flex justify-end" : "flex justify-start";

  return (
    <section id={id} className={`w-full max-w-7xl mx-auto px-6 md:px-8 py-16 scroll-mt-24 ${className}`}>
      <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
        <div className={`flex flex-col items-start gap-8 md:gap-10 ${isRight ? "md:flex-row-reverse" : "md:flex-row"}`}>
          <img
            src={imageSrc}
            alt={imageAlt}
            className="w-full h-auto md:w-[520px] md:h-[400px] object-cover flex-shrink-0"
          />
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
    </section>
  );
}
