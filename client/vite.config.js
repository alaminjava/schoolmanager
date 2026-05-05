// client/vite.config.js
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    outDir: "client/dist",  // Ensure the output is in client/dist
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy API requests to the back-end (adjust to match your Render URL)
      "/api": {
        target: "https://school-manager-md1w.onrender.com", // Your Render back-end URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
});