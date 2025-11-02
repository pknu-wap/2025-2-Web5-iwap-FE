/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
  variants: {
    extend: {
      animation: ["group-hover"],
    },
  },
  plugins: [],
};
