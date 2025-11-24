"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FacialEditor from "@/components/facial/FacialEditor";
import { ProjectIntroModal } from "@/components/sections/ProjectIntroSections";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function FacialPage() {
  const { theme } = useTheme();
  const [hasMounted, setHasMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => { setHasMounted(true); }, []);

  const pageBackgroundStyle = {
    backgroundImage: theme === 'dark'
      ? `linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000), url('/images/bg-dark/facial_dark.jpg')`
      : `linear-gradient(to bottom, rgba(13, 17, 19, 0), #98B9C2), url('/images/bg-light/facial_light.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) return null;

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]" style={pageBackgroundStyle}>
      <ProjectIntroModal
        projects={["facial"]}
        open={showIntro}
        onClose={() => setShowIntro(false)}
      />
      <div className="w-full h-full flex translate-x-5 md:translate-x-0 items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="flex flex-col w-full max-w-lg relative min-h-0">
          <div className="w-[90%] md:w-full pt-0 flex flex-col gap-4">
            <PageHeader
              title="Fac!al"
              subtitle="얼굴의 특징을 변경"
              goBack={true}
              padding="p-0"
              isAbsolute={false}
              closeButtonClassName="-translate-x-6 md:translate-x-0"
            />
            <div className="w-full flex flex-col">
              <FacialEditor />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}