import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // .env.* 읽기
  const env = loadEnv(mode, process.cwd(), "");
  // 프록시 타게 하려면 VITE_API_BASE를 비워둔다 ("", "undefined", "null" 모두 비움으로 처리)
  const apiBaseRaw = (env.VITE_API_BASE ?? "").trim();
  const useProxy =
    !apiBaseRaw || apiBaseRaw === "undefined" || apiBaseRaw === "null";

  // 개발용 백엔드 기본 타깃 (LAN IP 바꾸면 여기만 수정)
  const DEV_API_TARGET = "http://192.168.1.183:5000";

  return {
    plugins: [react()],

    // 로컬 네트워크 접속/HMR 안정화 옵션(선택)
    server: {
      host: true, // 0.0.0.0 바인딩 (모바일 테스트용)
      port: 5173,
      cors: true,
      strictPort: true,
      hmr: {
        // LAN에서 HMR 이슈 있으면 주석 해제해서 고정
        // host: "192.168.1.183",
        // protocol: "ws",
        // port: 5173,
      },

      // VITE_API_BASE가 비어 있을 때만 프록시 활성화
      proxy: useProxy
        ? {
            "/api": {
              target: DEV_API_TARGET,
              changeOrigin: true,
              ws: true,
              // 필요시 쿠키/헤더 전달 강화
              // headers: { "X-Forwarded-Host": "vite-dev" },
            },
            "/uploads": {
              target: DEV_API_TARGET,
              changeOrigin: true,
            },
            // 업로드 디렉토리가 다르면 여기도 추가
            // "/media": { target: DEV_API_TARGET, changeOrigin: true },
            // "/static": { target: DEV_API_TARGET, changeOrigin: true },
          }
        : undefined,
    },

    // 미세 최적화(선택)
    preview: {
      host: true,
      port: 4173,
    },
  };
});
