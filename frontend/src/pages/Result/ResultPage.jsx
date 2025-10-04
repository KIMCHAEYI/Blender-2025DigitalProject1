import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import ResultCard from "../../components/ResultCard";
import { downloadPdf } from "../../utils/pdfUtils";

import "./ResultPage.css";

/** 라벨+의미 기준 중복 제거 */
const uniqByLabelMeaning = (arr = []) =>
  Array.from(
    new Map(arr.map((o) => [`${o.label}__${o.meaning ?? ""}`, o])).values()
  );

/** 타이틀/아이콘 */
const TITLE = {
  house: "집",
  tree: "나무",
  person: "사람",
  person_male: "사람(남)",
  person_female: "사람(여)",
};
const ICON = {
  house: "🏠",
  tree: "🌳",
  person: "👤",
  person_male: "👦",
  person_female: "👧",
};

/** subtype 매핑 */
const mapSubtype = (s) => {
  if (!s) return null;
  const t = String(s).toLowerCase();
  if (t.includes("female") || t.includes("woman") || t.includes("girl"))
    return "person_female";
  if (t.includes("male") || t.includes("man") || t.includes("boy"))
    return "person_male";
  return null;
};

/** normalize */
const normalizeDrawings = (raw = {}) => {
  const out = {};
  const list = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([k, v]) => ({ ...v, _key: k }));

  for (const item of list) {
    const typeFromKey = item?._key || item?.type || item?.result?.type;
    const subtypeRaw = item?.subtype || item?.result?.subtype || item?.gender;
    const mappedSub = mapSubtype(subtypeRaw);

    let key = typeFromKey || "unknown";
    if (
      (key === "person" || key === "person_female" || key === "person_male") &&
      mappedSub
    )
      key = mappedSub;
    if (key === "person_woman") key = "person_female";
    if (key === "person_man") key = "person_male";

    const image =
      item?.image ||
      item?.result?.image ||
      item?.file_path ||
      item?.path ||
      item?.result?.path ||
      "";

    // const yolo =
    //   item?.yolo ||
    //   item?.result?.yolo ||
    //   (item?.result?.yolo_image ? { image: item.result.yolo_image } : null) ||
    //   (item?.result?.bbox_url ? { image: item.result.bbox_url } : null) ||
    //   (item?.yolo?.bbox_url ? { image: item.yolo.bbox_url } : null);
    // 이걸 거치면 sec.yolo는 문자열(String) 이 되고, ResultCard.jsx에서는 sec.yolo?.image로 접근하니까 → undefined

    const yoloRaw =
      item?.yolo ||
      item?.result?.yolo ||
      item?.result?.yolo_image ||
      item?.result?.bbox_url ||
      item?.result?.bbox_image ||
      item?.yolo?.bbox_url;

    const yolo =
      typeof yoloRaw === "string" && yoloRaw.trim()
        ? { image: yoloRaw } // ✅ 문자열이면 { image: ... } 형태로 감싸줌
        : yoloRaw && yoloRaw.image
        ? yoloRaw
        : null;

    let analysisRaw =
      item?.analysis || item?.result?.analysis || item?.objects || [];
    const analysis = Array.isArray(analysisRaw)
      ? analysisRaw
      : analysisRaw?.analysis || [];

    const counselor_summary =
      item?.counselor_summary || item?.result?.counselor_summary || "";

    const pick = (v) =>
      typeof v !== "undefined" && v !== null ? v : undefined;
    const drawing_id =
      pick(item?.drawing_id) ??
      pick(item?.result?.drawing_id) ??
      pick(item?.id) ??
      pick(item?.result?.id) ??
      null;

    out[key] = {
      ...item,
      type: key,
      subtype: mappedSub || item?.subtype,
      image,
      yolo,
      analysis,
      drawing_id,
      counselor_summary,
      duration: item?.duration || item?.result?.duration || 0,
    };
  }
  return out;
};

/** 보기 좋은 순서 */
const sortTypes = (types) => {
  const order = {
    house: 1,
    tree: 2,
    person_male: 3,
    person_female: 4,
    person: 5,
  };
  return [...types].sort((a, b) => (order[a] || 99) - (order[b] || 99));
};

/** duration format */
const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};

export default function ResultPage() {
  const navigate = useNavigate();
  const { userData, setUserData } = useUserContext();
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

  const [downloading, setDownloading] = useState(false);

  return (
    <div className="result-mobile">
      {/* 상단 요약 */}
      <header className="summary-bar">
        <h1>종합 결과</h1>
        <p style={{ marginTop: "4px", fontSize: "14px", color: "#444" }}>
          총 소요시간: {formatDuration(totalDuration)}
        </p>
      </header>

      {/* 진단 카드 */}
      <section className="diagnosis-card">
        <div className="diagnosis-text">
          {safeUser.diagnosis || "(진단 내용 준비 중)"}
        </div>
      </section>

      {/* 종합 해석 카드 */}
      <section className="overall-card">
        <h2>📝 종합 해석</h2>
        <p style={{ whiteSpace: "pre-line" }}>
          {safeUser.overall_summary || "(해석 준비 중)"}
        </p>
      </section>

      {/* 각 그림 카드 */}

      <section className="cards-grid" aria-label="그림 분석 카드 (2×2)">
        <div className="cards-grid-inner">
          <ResultCard
            title="집"
            icon="🏠"
            sec={drawingsNormalized.house || {}}
            formatDuration={formatDuration}
          />
          <ResultCard
            title="나무"
            icon="🌳"
            sec={drawingsNormalized.tree || {}}
            formatDuration={formatDuration}
          />
          <ResultCard
            title="여자사람"
            icon="👩"
            sec={drawingsNormalized.person_female || {}}
            formatDuration={formatDuration}
          />
          <ResultCard
            title="남자사람"
            icon="👨"
            sec={drawingsNormalized.person_male || {}}
            formatDuration={formatDuration}
          />
        </div>
      </section>

      {/* FAB */}
      <div className="fab">
        <button
          className="fab-btn"
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
          📄 요약 PDF
        </button>
        <button
          className="fab-btn"
          onClick={() =>
            downloadPdf({
              version: "full",
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
          🔎 상세 PDF
        </button>
        <button className="fab-btn" onClick={() => navigate("/")}>
          🏠 홈화면으로
        </button>
      </div>
    </div>
  );
}
