import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Export Vite config
export default defineConfig({
  root: './client', // Ensure Vite works within the client directory
  build: {
    outDir: 'client/dist', // Specify the output directory for Vercel
    emptyOutDir: true, // Clear out old build files
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Make server accessible
    port: 5173, // Default port for Vite
    strictPort: false,
    proxy: {
      // Proxy API requests to the back-end
      "/api": {
        target: "https://school-manager-md1w.onrender.com", // Your Render back-end URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
});