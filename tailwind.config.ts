import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Premium colors
        gold: {
          DEFAULT: "hsl(var(--gold-metallic))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        action: {
          blue: "hsl(var(--action-blue))",
          teal: "hsl(var(--action-teal))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // Shimmer animation for gradient text
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        // Pure Science Search AI animations
        "pulse-gold": {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        "gold-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(212, 175, 55, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(212, 175, 55, 0.5)" },
        },
        "science-panel-open": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "accordion-down": {
          from: {
            height: "0",
            opacity: "0",
            transform: "translateY(-8px)",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
            transform: "translateY(0)",
          },
          to: {
            height: "0",
            opacity: "0",
            transform: "translateY(-8px)",
          },
        },
        // Banner animations - Fade In
        "banner-fade-in-subtle": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "banner-fade-in-enhanced": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Banner animations - Slide Up
        "banner-slide-up-subtle": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "banner-slide-up-enhanced": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Banner animations - Slide Down
        "banner-slide-down-subtle": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "banner-slide-down-enhanced": {
          "0%": { opacity: "0", transform: "translateY(-40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Banner animations - Scale In
        "banner-scale-in-subtle": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "banner-scale-in-enhanced": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Logo reveal animations for InfoLink
        "logo-reveal": {
          "0%": { 
            opacity: "0", 
            transform: "scale(0.3) translateY(20px)" 
          },
          "50%": { 
            opacity: "1", 
            transform: "scale(1.1) translateY(0)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "scale(1) translateY(0)" 
          },
        },
        "logo-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        // News ticker marquee animation
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // News ticker enhanced effects
        blink: {
          "0%, 50%, 100%": { opacity: "1" },
          "25%, 75%": { opacity: "0.3" },
        },
        glow: {
          "0%, 100%": { filter: "drop-shadow(0 0 2px currentColor)" },
          "50%": { filter: "drop-shadow(0 0 8px currentColor)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
        // Premium dashboard animations
        "donut-fill": {
          "0%": { strokeDashoffset: "113.1" },
          "100%": { strokeDashoffset: "var(--target-offset)" },
        },
        "card-glow": {
          "0%, 100%": { boxShadow: "0 0 0 rgba(212, 175, 55, 0)" },
          "50%": { boxShadow: "0 0 30px rgba(212, 175, 55, 0.1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        // 3D icon animations
        "icon-float": {
          "0%, 100%": { transform: "translateY(0) perspective(200px) rotateX(5deg)" },
          "50%": { transform: "translateY(-2px) perspective(200px) rotateX(3deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.4)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(245, 158, 11, 0.6)" },
        },
        "metal-shine": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "omega-coin-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        // Pure Science Search AI animations
        "pulse-gold": "pulse-gold 1s ease-in-out infinite",
        "gold-glow": "gold-glow 3s ease-in-out infinite",
        "science-panel-open": "science-panel-open 0.3s ease-out",
        // Banner animations
        "banner-fade-in-subtle": "banner-fade-in-subtle 0.2s ease-out",
        "banner-fade-in-enhanced": "banner-fade-in-enhanced 0.4s ease-out",
        "banner-slide-up-subtle": "banner-slide-up-subtle 0.25s ease-out",
        "banner-slide-up-enhanced": "banner-slide-up-enhanced 0.4s ease-out",
        "banner-slide-down-subtle": "banner-slide-down-subtle 0.25s ease-out",
        "banner-slide-down-enhanced": "banner-slide-down-enhanced 0.4s ease-out",
        "banner-scale-in-subtle": "banner-scale-in-subtle 0.2s ease-out",
        "banner-scale-in-enhanced": "banner-scale-in-enhanced 0.35s ease-out",
        // Logo animations
        "logo-reveal": "logo-reveal 0.8s ease-out forwards",
        "logo-pulse": "logo-pulse 2s ease-in-out infinite",
        // News ticker
        marquee: "marquee 30s linear infinite",
        blink: "blink 1s ease-in-out 3",
        glow: "glow 2s ease-in-out infinite",
        shake: "shake 0.5s ease-in-out infinite",
        // Premium dashboard animations
        "donut-fill": "donut-fill 0.8s ease-out forwards",
        "card-glow": "card-glow 3s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        // 3D icon animations
        "icon-float": "icon-float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "metal-shine": "metal-shine 3s linear infinite",
        "omega-coin-flip": "omega-coin-flip 4s ease-in-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
