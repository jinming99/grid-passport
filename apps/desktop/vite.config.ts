import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig((): UserConfig => ({
  plugins: [react()],

  // Tauri expects a fixed port; fail fast if taken so IPC wiring doesn't
  // silently point at a stale dev server.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
    // Allow Vite to read workspace packages outside apps/desktop.
    fs: { allow: [path.resolve(__dirname, "..", "..")] },
  },

  // Env keys starting with VITE_ or TAURI_ENV_* are exposed to the frontend.
  envPrefix: ["VITE_", "TAURI_ENV_*"],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    // Tauri 2 ships with a modern webview on every platform; no downleveling.
    target: "esnext",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
