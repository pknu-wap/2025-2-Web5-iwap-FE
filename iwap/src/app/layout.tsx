import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const Pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
});

export const metadata: Metadata = {
  title: "!WAP",
  description: "!WAP Project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        suppressHydrationWarning
        className={`relative overflow-x-hidden transition-colors duration-300 ${Pretendard.className}`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('iwap.theme');
                  if (stored === 'dark') {
                    document.body.style.backgroundColor = '#171717';
                    document.body.style.color = '#ededed';
                  } else {
                    document.body.style.backgroundColor = '#ffffff';
                    document.body.style.color = '#171717';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
