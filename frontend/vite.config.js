import { defineConfig } from "vite";
import react    from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path     from "path";

export default defineConfig({
  plugins: [
    tailwind(),   // Tailwind v4 — must come before react()
    react(),
  ],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target      : "http://localhost:8000",
        changeOrigin: true,
        secure      : false,
      },
    },
  },

  build: {
    outDir   : "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});