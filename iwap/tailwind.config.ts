import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f3c8e0",
        accent: "#e9c6dd",
        text: "#1f1f1f",
        subtext: "rgba(31,31,31,0.72)",
      },
      borderRadius: {
        card: "22px",
      },
      fontFamily: {
        manrope: ['var(--font-manrope)'],
        playfair: ['var(--font-playfair)'],
      },
    },
  },
  plugins: [],
};
export default config;
