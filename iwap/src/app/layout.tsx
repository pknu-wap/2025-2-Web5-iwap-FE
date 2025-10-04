import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 상단 고정 헤더 */}
        <header className="w-full bg-white h-[110px] flex flex-col items-center justify-center shadow z-50">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">
            iWAP
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            !nteractive Web Art Project
          </p>
        </header>

        {/* 본문은 헤더 높이만큼 패딩 */}
        <main>{children}</main>
      </body>
    </html>
  );
}