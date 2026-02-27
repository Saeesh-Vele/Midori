import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// Optimized Vite config for better performance
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Performance optimizations
  server: {
    port: 8080,
    host: true,
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-select', '@radix-ui/react-dialog'],
          charts: ['recharts']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts']
  }
})
