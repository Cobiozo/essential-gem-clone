import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && visualizer({
      open: false,
      gzipSize: true,
      filename: "dist/stats.html",
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only isolate heavy, on-demand libraries
          if (id.includes('node_modules/xlsx')) return 'lib-xlsx';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/html2pdf.js')) return 'lib-pdf';
          if (id.includes('node_modules/fabric')) return 'lib-fabric';
          if (id.includes('node_modules/recharts')) return 'lib-charts';
          if (id.includes('node_modules/jszip')) return 'lib-zip';
          if (id.includes('node_modules/embla-carousel')) return 'lib-carousel';
          // Everything else (React, Radix, dnd-kit, Supabase, etc.) — let Vite decide
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react',
      'qrcode.react',
    ],
    exclude: [
      'xlsx',
      'jspdf',
      'html2canvas',
      'fabric',
    ],
  },
}));
