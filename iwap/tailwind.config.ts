import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
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
      keyframes: {
        ripple: {
          "0%": {
            transform: "translate(-50%, -50%) scale(0.35)",
            opacity: "0.8",
            "box-shadow": "0 0 0 0 rgba(126, 170, 239, 0.55)",
          },
          "45%": {
            opacity: "0.45",
            "box-shadow": "0 0 0 22px rgba(126, 170, 239, 0.4)",
          },
          "100%": {
            transform: "translate(-50%, -50%) scale(6)",
            opacity: "0",
            "box-shadow": "0 0 0 42px rgba(126, 170, 239, 0)",
          },
        },
      },
      animation: {
        ripple: "ripple 1s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
