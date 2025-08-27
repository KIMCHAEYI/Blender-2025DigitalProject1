import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseRaw = (env.VITE_API_BASE ?? "").trim();
  const useProxy =
    !apiBaseRaw || apiBaseRaw === "undefined" || apiBaseRaw === "null";

  const DEV_API_TARGET = "http://172.20.31.108:5000"; // ← 너 백엔드 IP

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: useProxy
        ? {
            "/api": { target: DEV_API_TARGET, changeOrigin: true },
            "/uploads": { target: DEV_API_TARGET, changeOrigin: true },
          }
        : undefined,
    },
  };
});
