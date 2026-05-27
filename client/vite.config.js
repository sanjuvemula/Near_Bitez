import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

const devApiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
