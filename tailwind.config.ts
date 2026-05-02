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
        surface: {
          base:   "#0B0F14",
          muted:  "#11161C",
          raised: "#161B22",
          border: "#232A34",
        },
        content: {
          primary:   "#E6EDF3",
          secondary: "#9DA7B3",
          muted:     "#6B7280",
        },
        brand: {
          DEFAULT: "#3B82F6",
          hover:   "#2563EB",
        },
        ok:   "#10B981",
        warn: "#F59E0B",
        fail: "#EF4444",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.25)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
      },
    },
  },
  plugins: [],
};
export default config;
