import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "client/dist", // Make sure the output directory is 'client/dist'
    emptyOutDir: true,     // Clean the output directory before each build
  },
  plugins: [react()],
});