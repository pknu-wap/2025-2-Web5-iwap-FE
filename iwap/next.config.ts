import type { NextConfig } from "next";

// Ensure Tailwind v4 falls back to the JS implementation on platforms
// where the oxide native binary is unavailable (e.g., Vercel build).
process.env.TAILWIND_DISABLE_OXIDE = "1";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};
export default nextConfig;
