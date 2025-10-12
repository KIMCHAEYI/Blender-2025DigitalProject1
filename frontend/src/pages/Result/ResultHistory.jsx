// src/pages/Result/ResultHistory.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../../contexts/UserContext";
import { downloadPdf } from "../../utils/pdfUtils";
import "./ResultHistory.css";

/** 중복 제거 유틸 */
const uniqByLabelMeaning = (arr = []) =>
  Array.from(
    new Map(arr.map((o) => [`${o.label}__${o.meaning ?? ""}`, o])).values()
  );

/** 제목 매핑 */
const TITLE = {
  house: "집",
  tree: "나무",
  person: "사람",
  person_male: "사람(남)",
  person_female: "사람(여)",
};

/** 순서 정렬 */
const sortTypes = (types) => {
  const order = {
    house: 1,
    tree: 2,
    person_male: 3,
    person_female: 4,
  };
  return [...types]
    .filter((t) => t in order)
    .sort((a, b) => (order[a] || 99) - (order[b] || 99));
};

/** URL 정규화 */
const normalizeUrl = (url) => {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || /^data:|^blob:/i.test(url)) return url;
  const API_BASE =
    import.meta.env.VITE_API_BASE ||
    `${window.location.protocol}//${window.location.hostname}:5000`;
  const cleanPath = url.replace(/^\/+/, "");
  return `${API_BASE}/${cleanPath}`;
};

/** 그림 데이터 정리 */
const normalizeDrawings = (raw = []) => {
  const out = {};
  const list = Array.isArray(raw) ? raw : Object.values(raw);

  for (const item of list) {
    const filePath = item.path || "";
    if (
      filePath.includes("step2") ||
      filePath.includes("add") ||
      filePath.includes("_2") ||
      filePath.includes("보충")
    )
      continue;

    const key = item.type || item._key || "unknown";
    if (out[key]) continue;

    const res = item.result || {};
    out[key] = {
      ...item,
      type: key,
      image: normalizeUrl(item.path),
      yolo: res.bbox_url ? { image: normalizeUrl(res.bbox_url) } : null,
      analysis: Array.isArray(res.analysis)
        ? res.analysis
        : res.analysis?.analysis || [],
      counselor_summary: res.counselor_summary || "",
      colorAnalysis: res.colorAnalysis || {},
    };
  }

  return out;
};

/** 시간 포맷 */
const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};

export default function ResultHistory() {
  const navigate = useNavigate();
  const { userData, setUserData } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [overall, setOverall] = useState({});

  const sessionId =
    userData?.session_id ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("latest_session_id");

  /** ✅ DB에서 결과 불러오기 */
  useEffect(() => {
    if (!sessionId) {
      console.warn("❌ session_id 없음, 로그인 필요");
      setLoading(false);
      return;
    }

    const API_BASE =
      import.meta.env.VITE_API_BASE ||
      `${window.location.protocol}//${window.location.hostname}:5000`;

    axios
      .get(`${API_BASE}/api/sessions/${sessionId}`)
      .then((res) => {
        const data = res.data;
        const overall_summary = data.summary_overall?.overall_summary || "";
        const diagnosis_summary = data.summary_overall?.diagnosis_summary || "";

        setOverall({ overall_summary, diagnosis_summary });
        setUserData((prev) => ({ ...(prev || {}), ...data }));
      })
      .catch((err) => console.error("❌ 세션 데이터 불러오기 실패:", err))
      .finally(() => setLoading(false));
  }, []);

  const safeUser = userData ?? {
    name: "-",
    gender: "-",
    birth: "-",
    drawings: {},
  };

  const drawingsNormalized = useMemo(
    () => normalizeDrawings(safeUser.drawings || {}),
    [safeUser.drawings]
  );

  const TYPES = useMemo(
    () => sortTypes(Object.keys(drawingsNormalized)),
    [drawingsNormalized]
  );

  const totalDuration = useMemo(() => {
    if (!drawingsNormalized) return 0;
    return Object.values(drawingsNormalized).reduce(
      (sum, sec) => sum + (Number(sec?.duration) || 0),
      0
    );
  }, [drawingsNormalized]);

  if (loading) return <div className="loading">결과 불러오는 중...</div>;

  return (
    <div className="result-history">
      <h2 className="question">
        <span className="highlight">{safeUser.name}</span> 님의 지난 검사
        결과입니다
      </h2>

      <div className="result-card-box">
        <div className="result-card single-card">
          <h3>
            검사일: {new Date(safeUser.created_at).toLocaleDateString("ko-KR")}
          </h3>
          <p>{overall.diagnosis_summary || "(진단 내용 준비 중)"}</p>
        </div>

        <div className="result-card-buttons">
          <button
            className="btn-download"
            onClick={() =>
              downloadPdf({
                version: "summary",
                safeUser,
                TYPES,
                drawingsNormalized,
                uniqByLabelMeaning,
                TITLE,
                formatDuration,
                totalDuration,
                setDownloading,
              })
            }
            disabled={downloading}
          >
            {downloading ? "생성 중..." : "📄 요약 PDF 다운로드"}
          </button>

          <button
            className="btn-detail"
            onClick={() => navigate("/result/page")}
          >
            자세히 보기
          </button>
        </div>
      </div>

      <div className="button-wrap">
        <button className="btn-gohome" onClick={() => navigate("/")}>
          홈화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}
