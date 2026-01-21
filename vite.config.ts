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
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Consolidated core chunk: React + Router + Query (reduces requests)
          'vendor-core': [
            'react', 
            'react-dom', 
            'react-router-dom',
            '@tanstack/react-query',
          ],
          
          // Consolidated UI chunk: All Radix + Icons + UI utilities
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-avatar',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-slider',
            'lucide-react',
            'cmdk',
            'sonner',
            'vaul',
          ],
          
          // Consolidated utilities: DnD + Date + Supabase
          'vendor-utils': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/modifiers',
            '@dnd-kit/utilities',
            '@supabase/supabase-js',
            'date-fns',
          ],
          
          // Heavy libraries - loaded on-demand only
          'lib-xlsx': ['xlsx'],
          'lib-pdf': ['jspdf', 'html2canvas', 'html2pdf.js'],
          'lib-fabric': ['fabric'],
          'lib-charts': ['recharts'],
          'lib-zip': ['jszip'],
          'lib-carousel': ['embla-carousel-react'],
        },
      },
    },
    // Increase chunk size warning limit
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
