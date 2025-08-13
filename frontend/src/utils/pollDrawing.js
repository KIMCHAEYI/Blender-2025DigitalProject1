// src/utils/pollDrawing.js
import axios from "axios";

const BASE = "http://172.20.8.138:5000";

/**
 * YOLO 해석 완료될 때까지 상태 폴링하고, 완료되면 result({ yolo, analysis }) 반환
 */
export async function waitForAnalysis(
  sessionId,
  drawingId,
  {
    intervalMs = 2000,
    maxAttempts = 60, // 최대 2분
    onTick = () => {},
  } = {}
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;

    // 1) 상태 확인
    const s = await axios.get(
      `${BASE}/api/drawings/${sessionId}/${drawingId}/status`
    );
    const status = s.data?.status;
    onTick(status, attempt);

    if (status === "done") {
      // 2) 결과 가져오기
      const r = await axios.get(
        `${BASE}/api/drawings/${sessionId}/${drawingId}/result`
      );
      return r.data?.result; // { yolo, analysis }
    }
    if (status === "error") {
      const r = await axios
        .get(`${BASE}/api/drawings/${sessionId}/${drawingId}/result`)
        .catch(() => null);
      const msg = r?.data?.result?.error || "YOLO 분석 실패";
      throw new Error(msg);
    }

    // uploaded | processing → 잠시 대기
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error("시간 초과: 분석이 끝나지 않았어요.");
}
