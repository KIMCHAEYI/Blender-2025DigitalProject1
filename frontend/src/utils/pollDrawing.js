// src/utils/pollDrawing.js
import axios from "axios";

/** API BASE 결정: .env의 VITE_API_BASE가 있으면 그걸 쓰고, 없으면 same-origin */
function resolveApiBase() {
  const raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return ""; // same-origin
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}
const API_BASE = resolveApiBase();

/** 공용 axios 인스턴스: same-origin이면 baseURL 생략 */
const api = axios.create({
  baseURL: API_BASE || undefined,
  timeout: 15000, // 15s
});

/** sleep helper */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * YOLO 해석 완료될 때까지 상태 폴링
 * - status === "done" 이면 { yolo, analysis, image? } 반환
 * - status === "error" 이면 서버가 저장한 오류 메시지로 throw
 * - 404면 즉시 중단(잘못된 drawing_id)
 * - 네트워크/일시 오류는 짧게 재시도
 */
export async function waitForAnalysis(
  sessionId,
  drawingId,
  {
    intervalMs = 2000, // 기본 2초 간격
    maxAttempts = 60, // 최대 2분
    onTick = () => {},
  } = {}
) {
  if (!sessionId || !drawingId) {
    throw new Error("세션 또는 그림 ID가 없습니다.");
  }

  const enc = (v) => encodeURIComponent(String(v));

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;

    try {
      // 1) 상태 확인
      const s = await api.get(
        `/api/drawings/${enc(sessionId)}/${enc(drawingId)}/status`,
        {
          // 4xx는 코드에서 처리하므로 5xx만 throw 되도록
          validateStatus: (st) => st < 500,
        }
      );

      if (s.status === 404) {
        // 잘못된 ID로 폴링 중 — 즉시 중단
        throw new Error(
          "서버에 해당 그림 ID가 없습니다. 업로드 응답의 drawing_id를 그대로 사용했는지 확인하세요."
        );
      }

      const status = s.data?.status;
      onTick(status, attempt);

      if (status === "done" || status === "error") {
        // 2) 결과 가져오기 (done/ error 모두 result 조회 시도)
        const r = await api
          .get(`/api/drawings/${enc(sessionId)}/${enc(drawingId)}/result`, {
            validateStatus: (st) => st < 500,
          })
          .catch(() => null);

        const result = r?.data?.result ?? null;

        if (status === "done") {
          // 정상 완료
          return result; // { yolo, analysis, image? }
        }

        // status === "error"
        const msg =
          (result && (result.error || result.message)) || "YOLO 분석 실패";
        throw new Error(msg);
      }

      // uploaded | processing → 잠시 대기 후 재시도
      await sleep(intervalMs);
    } catch (err) {
      // 네트워크/타임아웃 등 일시 오류 → 짧게 기다렸다 1회 더 시도
      // 단, 위에서 만든 명시적 메시지(404/에러 상태)는 바로 throw
      const msg = String(err?.message || "");
      const isImmediateFail =
        msg.includes("그림 ID가 없습니다") || msg.includes("분석 실패");

      if (isImmediateFail) throw err;

      // 일시 오류 — 한 번 더 기다렸다가 진행
      await sleep(Math.min(1000, intervalMs / 2));
    }
  }

  throw new Error("시간 초과: 분석이 끝나지 않았어요.");
}
