import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// Mirrors apps/desktop/vite.config.ts. Port 1430 to avoid collision with the
// applicant binary (1420) when both run in a two-binary demo.
export default defineConfig((): UserConfig => ({
  plugins: [react()],

  clearScreen: false,
  server: {
    port: 1430,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1431 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
    fs: { allow: [path.resolve(__dirname, "..", "..")] },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    target: "esnext",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
