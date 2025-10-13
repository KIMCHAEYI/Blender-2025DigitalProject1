// frontend/src/utils/reportUtils.js
import axios from "axios";

// 서버 주소 사용 규칙: Vite 환경변수 > 하드코딩
const resolveApiBase = () => {
  let raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null")
    return "http://10.62.90.68:5000";
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://10.62.90.68:5000";
  }
};
const API_BASE = resolveApiBase();

// 절대경로 합성 (기존 함수와 동일 동작)
export const toAbsUrl = (path) => {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;
  return `${API_BASE}${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
};

/** Python(ReportLab) 정밀 리포트 다운로드 */
export async function downloadProReport({ sessionId, setDownloading }) {
  if (!sessionId) {
    alert("세션 ID가 없습니다.");
    return;
  }
  try {
    setDownloading?.(true);
    const { data } = await axios.post(`${API_BASE}/api/report/generate`, {
      session_id: sessionId,
    });
    const url = toAbsUrl(data?.path);
    if (!url) throw new Error("PDF 경로가 비어 있습니다.");
    window.open(url, "_blank");
  } catch (e) {
    console.error("Report PDF 생성 실패:", e);
    alert("PDF 생성에 실패했습니다.");
  } finally {
    setDownloading?.(false);
  }
}
