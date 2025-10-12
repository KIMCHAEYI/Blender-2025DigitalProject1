import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://172.20.14.232:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://172.20.14.232:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
