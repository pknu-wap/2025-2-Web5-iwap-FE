"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Stars,
  Code2,
  Palette,
  Music2,
  Boxes,
  Rocket,
  ArrowRight,
  Github,
  Mail,
  ExternalLink,
} from "lucide-react";

// 단일 파일 React 컴포넌트. Next.js 페이지 또는 임베드 컴포넌트로 사용 가능.
// TailwindCSS + Framer Motion 기반. shadcn/ui 없이 순수 유틸리티로 구성.
// 사용법: 이 파일을 /components/IwapLanding.tsx로 저장하고 <IwapLanding /> 렌더.

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`w-full max-w-7xl mx-auto px-6 md:px-8 ${className}`}>{children}</section>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
    {children}
  </span>
);

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-sm text-white/80 hover:text-white transition-colors">{children}</a>
);

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <motion.div variants={item} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    <div className="flex items-center gap-3">
      <div className="rounded-xl border border-white/10 bg-white/10 p-2">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
    <p className="mt-3 text-sm text-white/80 leading-relaxed">{desc}</p>
  </motion.div>
);

const ProjectCard = ({ title, desc, href, tags }: { title: string; desc: string; href: string; tags: string[] }) => (
  <motion.a
    variants={item}
    href={href}
    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-6 backdrop-blur hover:from-white/10 hover:to-white/[0.06] transition-colors"
  >
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <ExternalLink className="h-4 w-4 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
      </div>
      <p className="mt-2 text-sm text-white/80 leading-relaxed">{desc}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">{t}</span>
      ))}
    </div>
  </motion.a>
);

export default function IwapLanding() {
  return (
    <div className="min-h-screen w-full text-white bg-[radial-gradient(1200px_circle_at_10%_-10%,#6d28d9_0%,transparent_40%),radial-gradient(800px_circle_at_90%_-20%,#0ea5e9_0%,transparent_35%),linear-gradient(180deg,#0b0f1a_0%,#090b12_100%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
        <Section className="flex h-14 items-center justify-between">
          <a href="#home" className="font-semibold tracking-tight">
            <span className="relative">
              <span className="relative z-10">IWAP</span>
              <span className="absolute inset-x-0 -bottom-1 h-2 rounded-full bg-violet-500/30 blur" />
            </span>
          </a>
          <nav className="hidden gap-6 md:flex">
            <NavLink href="#about">소개</NavLink>
            <NavLink href="#projects">프로젝트</NavLink>
            <NavLink href="#features">특징</NavLink>
            <NavLink href="#contact">문의</NavLink>
          </nav>
          <a href="https://github.com/pknu-wap" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 transition-colors">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </Section>
      </header>

      {/* Hero */}
      <Section id="home" className="pt-14 pb-12 md:pt-24 md:pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
          <Pill>
            <Stars className="h-3.5 w-3.5" /> Interactive Web & Art Playground
          </Pill>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            인터랙션으로 사고하고 <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-sky-400 to-fuchsia-300">배우고 만든다</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
            IWAP은 Pukyong WAP의 인터랙티브 웹 실험실이다. 음악, 그래픽, 동작 입력을 결합해 학습과 창작을 한 공간에서 수행한다.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="#projects" className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors">
              데모 보기 <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/this-is-for-u" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition-colors">
              This‑is‑for‑u 열기
            </a>
          </div>
        </motion.div>

        {/* marquee */}
        <div className="mt-10 select-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap text-white/60 text-sm">
            <span className="mx-6 inline-flex items-center gap-2"><Palette className="h-4 w-4"/>Canvas 드로잉</span>
            <span className="mx-6 inline-flex items-center gap-2"><Music2 className="h-4 w-4"/>Tone.js·MIDI</span>
            <span className="mx-6 inline-flex items-center gap-2"><Boxes className="h-4 w-4"/>3D 이미지 링</span>
            <span className="mx-6 inline-flex items-center gap-2"><Code2 className="h-4 w-4"/>Next.js·TS</span>
            <span className="mx-6 inline-flex items-center gap-2"><Rocket className="h-4 w-4"/>Framer Motion</span>
            <span className="mx-6 inline-flex items-center gap-2"><Sparkles className="h-4 w-4"/>학습·실험·배포</span>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section id="about" className="py-12 md:py-16">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div variants={item} className="md:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-2xl font-bold tracking-tight">IWAP이란</h2>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">
              Interactive Web & Art Project. 수업, 개인 작업, 팀 프로젝트를 하나의 플레이그라운드로 통합한다. 코딩은 결과물이 아니라 인터랙션을 만드는 과정이다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Next.js",
                "TypeScript",
                "Tailwind",
                "FramerMotion",
                "Tone.js",
                "WebSocket",
                "Canvas",
              ].map((t) => (
                <span key={t} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.div variants={item} className="md:col-span-7 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-1">
            <div className="aspect-video w-full rounded-xl bg-[conic-gradient(at_10%_10%,#312e81_0deg,#0ea5e9_120deg,#14b8a6_240deg,#312e81_360deg)] p-0.5">
              <div className="h-full w-full rounded-xl bg-black/50 grid place-items-center text-center p-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  시연 영상 자리. 3D Ring, Piano Orchestra, This‑is‑for‑u 등 주요 인터랙션 GIF/비디오 삽입.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* Projects */}
      <Section id="projects" className="py-12 md:py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">프로젝트</h2>
          <a href="https://github.com/pknu-wap" className="text-sm text-white/80 hover:text-white">모두 보기 →</a>
        </div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ProjectCard
            title="This‑is‑for‑u"
            desc="캔버스에 앞면 드로잉, 뒷면 메시지로 디지털 엽서 생성. 이미지 다운로드와 메일 전송 옵션."
            href="/this-is-for-u"
            tags={["Canvas", "Download", "Mail"]}
          />
          <ProjectCard
            title="Piano Orchestra"
            desc="카메라 제스처 + MIDI 재생 동기화. Velocity, Sustain 이벤트를 반영한 실감형 합주."
            href="/piano"
            tags={["Tone.js", "MIDI", "Gesture"]}
          />
          <ProjectCard
            title="3D Image Ring"
            desc="원근·회전·프록시 클릭 레이어로 모바일에서도 자연스러운 3D 갤러리 탐색."
            href="/slides"
            tags={["FramerMotion", "3D", "UX"]}
          />
          <ProjectCard
            title="Lightswind Slides"
            desc="클릭 가능한 중앙 카드와 비동기 로딩. 스크롤-드래그 혼합 내비게이션."
            href="/slide2"
            tags={["Slides", "Motion", "Accessibility"]}
          />
          <ProjectCard
            title="Interactive Text"
            desc="데스크톱 호버·모바일 탭 차별화. 색상 전이와 타이포그래피 실험."
            href="/interactive-text"
            tags={["Typography", "Mobile", "A11y"]}
          />
          <ProjectCard
            title="WAP Portfolio"
            desc="수업 산출물과 주간 Subproject를 아카이브. 배포 자동화."
            href="/portfolio"
            tags={["CI/CD", "Docs", "Archive"]}
          />
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features" className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">특징</h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <Feature icon={Code2} title="모듈러 구조" desc="useCameraStream, useGestureSocket, useTonePlayer 등 기능 단위 분리. 유지보수와 재사용을 고려." />
          <Feature icon={Music2} title="정확한 오디오" desc="사용자 제스처 후 AudioContext 시작. Velocity·Sustain 지원으로 MIDI 충실 재생." />
          <Feature icon={Palette} title="감정 표현" desc="픽셀 브러시·팔레트·지우개로 감정 드로잉. 하트·스탬프 등 인터랙션 스티커." />
          <Feature icon={Boxes} title="3D 탐색" desc="정면 판정과 프록시 레이어로 직관적인 선택. 모바일 탭 최적화." />
          <Feature icon={Rocket} title="배포 자동화" desc="GitHub→Vercel 배포. CNAME 기반 커스텀 도메인 권장." />
          <Feature icon={Sparkles} title="학습과 쇼케이스" desc="수업 과제, 연구, 전시를 한곳에서 아카이브하고 실험." />
        </motion.div>
      </Section>

      {/* CTA */}
      <Section className="py-12">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 via-sky-500/10 to-fuchsia-500/20 p-6">
          <div className="absolute -inset-1 opacity-30 [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]">
            <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-500 blur-3xl" />
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h3 className="text-xl md:text-2xl font-bold">IWAP과 함께 인터랙션을 설계하세요</h3>
              <p className="mt-2 text-sm text-white/80">프로젝트 협업·수업 연동·전시 제안 환영. 학습과 창작의 경계를 지웁니다.</p>
            </div>
            <div className="flex gap-3 md:justify-end">
              <a href="https://github.com/pknu-wap" className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors">
                <Github className="h-4 w-4" /> GitHub 방문
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition-colors">
                <Mail className="h-4 w-4" /> 연락하기
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="text-xl font-semibold">문의</h3>
            <p className="mt-2 text-sm text-white/80">협업 제안, 수업 연계, 버그 리포트는 아래 메일로 보내주세요.</p>
            <a href="mailto:contact@iwap.kro.kr" className="mt-4 inline-flex items-center gap-2 text-sm text-white underline/30 hover:underline">
              <Mail className="h-4 w-4" /> contact@iwap.kro.kr
            </a>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <label className="text-sm">이름</label>
            <input className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20" placeholder="Your name" />
            <label className="mt-4 text-sm block">이메일</label>
            <input type="email" className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20" placeholder="you@example.com" />
            <label className="mt-4 text-sm block">메시지</label>
            <textarea className="mt-1 h-28 w-full resize-none rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20" placeholder="프로젝트나 협업 내용을 간단히 적어주세요." />
            <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors">
              보내기
            </button>
          </form>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <Section className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/60 text-sm">
          <p>© {new Date().getFullYear()} IWAP. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="https://github.com/pknu-wap" className="inline-flex items-center gap-2 hover:text-white"><Github className="h-4 w-4"/> GitHub</a>
          </div>
        </Section>
      </footer>

      {/* keyframes */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
