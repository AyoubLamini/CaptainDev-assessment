import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nova: {
          base: '#060b18',
          surface: '#0c1225',
          elevated: '#111a33',
          card: '#0f172a',
          hover: '#162040',
          border: '#1e2d4a',
          'border-light': '#293a5c',
          accent: '#0ea5e9',
          'accent-hover': '#38bdf8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
