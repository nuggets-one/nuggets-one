/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        // S9-F1: Pulse chip tokens — avoids raw amber-* in component code
        "pulse-chip-bg": "var(--color-pulse-chip-bg)",
        "pulse-chip-fg": "var(--color-pulse-chip-fg)",
      },
      textColor: {
        primary: "var(--color-text-primary)",
        muted: "var(--color-text-muted)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      ringColor: {
        focus: "var(--color-focus-ring)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
