import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "sans-serif"],
        serif: ["var(--font-lora)", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#fdf8f6",
          100: "#f2e8e5",
          500: "#e05a47",
          600: "#c2410c",
          700: "#9a3412",
          800: "#7c2d12",
          900: "#431407",
        },
      },
    },
  },
  plugins: [],
};
export default config;
