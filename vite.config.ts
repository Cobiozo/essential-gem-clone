import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { writeFileSync } from "fs";

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
    mode === "production" && {
      name: 'generate-version-json',
      closeBundle() {
        const version = Date.now().toString();
        writeFileSync('./dist/version.json', JSON.stringify({ version, buildTime: Date.now() }));
        console.log(`[version] Generated version.json: ${version}`);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
  build: {
    // No manualChunks: hand-picked vendor chunks hoisted shared CJS helpers
    // and deps into lib-* chunks, which forced the entry to import (and
    // modulepreload) heavy libs like recharts/jspdf/xlsx on every page.
    // Rollup's default splitting keeps those libs in on-demand chunks.
    rollupOptions: {
      output: {},
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
