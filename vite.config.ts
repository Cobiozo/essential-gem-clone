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
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // TanStack Query
          'vendor-query': ['@tanstack/react-query'],
          
          // Radix UI components
          'vendor-radix': [
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
          ],
          
          // DnD Kit
          'vendor-dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/modifiers',
            '@dnd-kit/utilities',
          ],
          
          // Heavy libraries - loaded separately
          'lib-xlsx': ['xlsx'],
          'lib-pdf': ['jspdf', 'html2canvas', 'html2pdf.js'],
          'lib-fabric': ['fabric'],
          'lib-charts': ['recharts'],
          'lib-editor': ['quill', 'react-quill'],
          'lib-zip': ['jszip'],
          'lib-carousel': ['embla-carousel-react'],
          
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Date utilities
          'vendor-date': ['date-fns'],
          
          // Icons
          'vendor-icons': ['lucide-react'],
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
    ],
    exclude: [
      'xlsx',
      'jspdf',
      'html2canvas',
      'fabric',
    ],
  },
}));
