// src/pages/Result/ResultPage.jsx — Mobile/Card UI + 사람 남/여 분리 + URL 안전보정 + 분석 폴링 보강
// - 상단 요약 바(Chip)
// - 가로 스크롤 카드(집/나무/사람(남/여)) + 원본/분석 탭
// - 세부 분석 접기/펼치기
// - FAB: 요약/상세 PDF, 홈

import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import axios from "axios";
import { waitForAnalysis } from "../../utils/pollDrawing";
import "./ResultPage.css";

// ===== BASE 안전 해석 (fallback 제거: same-origin 우선) =====
const resolveApiBase = () => {
  const raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return ""; // same-origin 사용
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
};
const API_BASE = resolveApiBase();

// ===== 절대/상대 URL 합성 (한글/공백 파일명 안전) =====
const toAbsUrl = (path) => {
  if (!path) return "";
  // 이미 절대 URL, data/blob URL이면 그대로
  if (/^(https?:)?\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;
  // BASE가 비어 있으면 same-origin 경로 그대로 사용
  if (!API_BASE) return encodeURI(path.startsWith("/") ? path : `/${path}`);
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${encodeURI(rel)}`;
};

/** 라벨+의미 조합 기준 중복 제거 */
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

/** subtype 문자열을 표준 키로 매핑 */
const mapSubtype = (s) => {
  if (!s) return null;
  const t = String(s).toLowerCase();
  if (t.includes("female") || t.includes("woman") || t.includes("girl"))
    return "person_female";
  if (t.includes("male") || t.includes("man") || t.includes("boy"))
    return "person_male";
  return null;
};

/** 드로잉 정규화: 다양한 형태(raw/result)에 대응 + 사람 남/여 분리 */
const normalizeDrawings = (raw = {}) => {
  const out = {};
  // raw가 객체(map)일 수도, 배열일 수도 있으므로 통일
  const list = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([k, v]) => ({ ...v, _key: k }));

  for (const item of list) {
    const typeFromKey = item?._key || item?.type || item?.result?.type;
    const subtypeRaw = item?.subtype || item?.result?.subtype || item?.gender;
    const mappedSub = mapSubtype(subtypeRaw);

    // 최종 키 결정
    let key = typeFromKey || "unknown";
    if (
      (key === "person" || key === "person_female" || key === "person_male") &&
      mappedSub
    )
      key = mappedSub;
    if (key === "person_woman") key = "person_female";
    if (key === "person_man") key = "person_male";

    // 표준화 필드 후보 넓게 수집
    const image =
      item?.image ||
      item?.result?.image ||
      item?.file_path ||
      item?.path ||
      item?.result?.path ||
      "";

    const yolo =
      item?.yolo ||
      item?.result?.yolo ||
      (item?.result?.yolo_image ? { image: item.result.yolo_image } : null);

    const analysis =
      item?.analysis ||
      item?.result?.analysis ||
      item?.objects || // 서버가 objects로 보낼 때
      [];

    // ✅ drawing_id는 "서버가 준 값"을 최우선으로 보존 (falsy라도 덮어쓰지 않기)
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

export default function ResultPage() {
  const navigate = useNavigate();
  const { userData, setUserData } = useUserContext(); // ← setUserData 복구
  const safeUser = userData ?? {
    name: "-",
    gender: "-",
    birth: "-",
    drawings: {},
  };

  /** 정규화된 드로잉 & 동적 타입 목록 */
  const drawingsNormalized = useMemo(
    () => normalizeDrawings(safeUser.drawings || {}),
    [safeUser.drawings]
  );
  const TYPES = useMemo(
    () => sortTypes(Object.keys(drawingsNormalized)),
    [drawingsNormalized]
  );

  /** 상단 요약 칩 (간단 규칙) */
  const summaryChips = useMemo(() => {
    return TYPES.map((t) => {
      const items = uniqByLabelMeaning(drawingsNormalized?.[t]?.analysis || []);
      const level =
        items.length >= 6 ? "주의" : items.length >= 3 ? "보통" : "안정";
      const color =
        level === "주의" ? "#ff6b6b" : level === "보통" ? "#ffd43b" : "#69db7c";
      return {
        type: t,
        label: `${ICON[t] ?? "🧩"} ${TITLE[t] ?? t}`,
        level,
        color,
      };
    });
  }, [TYPES, drawingsNormalized]);

  /** PDF 다운로드 진행 상태 */
  const [downloading, setDownloading] = useState(false);

  // ===== 서버에서 drawing_id / image / analysis 백필 =====
  useEffect(() => {
    // 세션 없으면 패스
    if (!userData?.session_id) return;

    // 이미 normalize된 섹션들 중 drawing_id가 없는 게 하나라도 있으면 백필
    const needsBackfill = Object.values(drawingsNormalized).some(
      (sec) =>
        typeof sec?.drawing_id === "undefined" || sec?.drawing_id === null
    );
    if (!needsBackfill) return;

    let canceled = false;

    (async () => {
      try {
        // 서버에 저장된 이 세션의 모든 그림 조회
        const resp = await axios.get(
          `${API_BASE || ""}/api/drawings/${encodeURIComponent(
            userData.session_id
          )}`
        );
        const list = resp?.data?.drawings || [];

        // 서버 목록을 타입별로 가장 최근 1개만 뽑아 매핑
        const byType = {};
        for (const d of list) {
          const t = d?.type || d?.result?.type;
          if (!t) continue;
          // 최신 우선
          if (
            !byType[t] ||
            (d?.created_at || 0) > (byType[t]?.created_at || 0)
          ) {
            byType[t] = d;
          }
        }

        if (canceled) return;

        // userData.drawings에 병합
        setUserData((prev) => {
          const prevDrawings = prev?.drawings || {};
          const merged = { ...prevDrawings };

          // house/tree/person 등 현재 카드 키 기준으로만 채움
          Object.keys(drawingsNormalized).forEach((key) => {
            const src =
              byType[key] ||
              byType[key.replace("_female", "")] ||
              byType[key.replace("_male", "")];

            if (!src) return;

            const imagePath =
              src?.image ||
              src?.result?.image ||
              src?.file_path ||
              src?.path ||
              src?.result?.path ||
              "";

            const drawingId =
              (typeof src?.drawing_id !== "undefined"
                ? src.drawing_id
                : undefined) ??
              (typeof src?.id !== "undefined" ? src.id : undefined) ??
              (typeof src?.result?.drawing_id !== "undefined"
                ? src.result.drawing_id
                : undefined) ??
              null;

            const analysis =
              src?.analysis || src?.result?.analysis || src?.objects || [];

            const yolo =
              src?.yolo ||
              src?.result?.yolo ||
              (src?.result?.yolo_image
                ? { image: src.result.yolo_image }
                : null);

            merged[key] = {
              ...(prevDrawings[key] || {}),
              type: key,
              image: merged[key]?.image || imagePath || "",
              yolo: merged[key]?.yolo || yolo || null,
              analysis: merged[key]?.analysis?.length
                ? merged[key].analysis
                : analysis || [],
              drawing_id:
                typeof merged[key]?.drawing_id !== "undefined"
                  ? merged[key].drawing_id
                  : drawingId,
            };
          });

          return { ...prev, drawings: merged };
        });
      } catch (e) {
        console.warn("backfill drawings failed:", e?.message || e);
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.session_id, setUserData]);

  /** PDF HTML 생성 (동적 TYPES 기반) */
  const buildPdfHtml = (version = "summary") => {
    const head = `
      <meta charset='UTF-8'/><meta name='viewport' content='width=device-width, initial-scale=1'/>
      <style>
        body{font-family:Pretendard,system-ui,-apple-system,'Segoe UI','Noto Sans KR',sans-serif;padding:24px;color:#1c1c1e}
        h1{font-size:22px;margin:0 0 12px}h2{font-size:18px;margin:24px 0 8px}
        img{width:100%;max-height:280px;object-fit:contain;border:1px solid #eee;border-radius:8px}
        ul{padding-left:18px}li{margin-bottom:6px}.muted{color:#666}
      </style>`;
    const secHtml = TYPES.map((t, idx) => {
      const sec = drawingsNormalized?.[t] || {};
      const items = uniqByLabelMeaning(sec.analysis || []);
      const img = toAbsUrl(sec.image);
      return `
        <section>
          <h2>${idx + 1}. ${TITLE[t] ?? t} 그림</h2>
          ${
            img
              ? `<img src='${img}' alt='${TITLE[t] ?? t}'/>`
              : `<p class='muted'>(이미지 없음)</p>`
          }
          ${
            items.length
              ? `<ul>${items
                  .map(
                    (o) =>
                      `<li>✅ <b>${o.label}</b>${
                        o.meaning ? ` — ${o.meaning}` : ""
                      }</li>`
                  )
                  .join("")}</ul>`
              : `<p class='muted'>분석 항목 없음</p>`
          }
        </section>`;
    }).join("");
    const summary = `<section><h2>종합 해석</h2><p>${
      safeUser?.overall_summary || "(해석 요약 준비 중)"
    }</p></section>`;
    return `<!doctype html><html lang='ko'><head><title>HTP 검사 결과</title>${head}</head><body><h1>HTP 검사 결과 (${
      version === "summary" ? "요약" : "상세"
    })</h1>${secHtml}${summary}</body></html>`;
  };

  /** PDF 저장 */
  const handleDownloadPDF = async (version = "summary") => {
    try {
      setDownloading(true);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const fn = `HTP_${(safeUser.name || "-").replace(/[^\w가-힣]/g, "")}_${(
        safeUser.birth || ""
      )
        .replaceAll("-", "")
        .slice(2)}_${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
        now.getHours()
      )}${pad(now.getMinutes())}_${version}`;
      const html = buildPdfHtml(version);
      const res = await axios.post(
        `${API_BASE || ""}/api/sessions/generate-pdf`,
        { html, filename: fn }
      );
      // 서버가 절대/상대 경로를 줄 수 있으니 안전 보정
      const url = toAbsUrl(res?.data?.path);
      if (url) window.open(url, "_blank");
    } catch (e) {
      alert("PDF 생성 실패. 다시 시도해 주세요.");
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="result-mobile">
      {/* 상단 요약 바 */}
      <header className="summary-bar">
        <h1>종합 결과</h1>
        <div className="chips">
          {summaryChips.map((c) => (
            <span
              key={c.type}
              className="chip"
              style={{ backgroundColor: c.color }}
            >
              {c.label} · {c.level}
            </span>
          ))}
        </div>
      </header>

      {/* 종합 해석 카드 */}
      <section className="overall-card">
        <h2>📝 종합 해석</h2>
        <p style={{ whiteSpace: "pre-line" }}>
          {safeUser.overall_summary || "(해석 준비 중)"}
        </p>
      </section>

      <section className="cards-grid" aria-label="그림 분석 카드 (2×2)">
        <div className="cards-grid-inner">
          {[
            {
              key: "house",
              title: "집",
              icon: "🏠",
              sec: drawingsNormalized.house || {},
            },
            {
              key: "tree",
              title: "나무",
              icon: "🌳",
              sec: drawingsNormalized.tree || {},
            },
            {
              key: "person_female",
              title: "여자사람",
              icon: "👩",
              sec: drawingsNormalized.person_female || {},
            },
            {
              key: "person_male",
              title: "남자사람",
              icon: "👨",
              sec: drawingsNormalized.person_male || {},
            },
          ].map(({ key, title, icon, sec }) => {
            const items = uniqByLabelMeaning(sec?.analysis || []);
            const original = toAbsUrl(sec?.image); // normalize가 path→image 로 올려둠
            const yolo = toAbsUrl(sec?.yolo?.image); // 없으면 "분석 없음" 정상

            return (
              <article key={key} className="card" aria-label={`${title} 카드`}>
                <div className="card-head">
                  <div className="title">
                    <span className="icon" aria-hidden>
                      {icon}
                    </span>
                    <div>
                      <div className="label">{title} 그림</div>
                      <div className="sub">객체 인식 {items.length}개</div>
                    </div>
                  </div>
                </div>

                {/* ▶ 원본/분석 이미지를 수평으로 나란히 */}
                <div className="card-img-row">
                  <figure className="img-cell">
                    {original ? (
                      <img
                        src={original}
                        alt={`${title} 원본`}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector(".img-empty")) {
                            const empty = document.createElement("div");
                            empty.className = "img-empty";
                            empty.textContent = "이미지 로드 실패";
                            parent.appendChild(empty);
                          }
                        }}
                      />
                    ) : (
                      <div className="img-empty">원본 없음</div>
                    )}
                    <figcaption className="img-cap">원본</figcaption>
                  </figure>

                  <figure className="img-cell">
                    {yolo ? (
                      <img src={yolo} alt={`${title} 분석`} loading="lazy" />
                    ) : (
                      <div className="img-empty">분석 없음</div>
                    )}
                    <figcaption className="img-cap">분석</figcaption>
                  </figure>
                </div>

                <details className="card-details">
                  <summary>세부 보기</summary>
                  {items.length ? (
                    <ul className="object-list">
                      {items.map((o, i) => (
                        <li key={`${o.label}-${i}`}>
                          <span className="tick" aria-hidden>
                            ✅
                          </span>
                          <b>{o.label}</b>
                          {o.meaning && (
                            <div className="meaning">{o.meaning}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">분석 항목이 없습니다.</p>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      </section>

      {/* FABs */}
      <div className="fab">
        <button
          className="fab-btn"
          onClick={() => handleDownloadPDF("summary")}
          disabled={downloading}
          title="요약 PDF"
        >
          📄 간단 PDF 다운로드
        </button>
        <button
          className="fab-btn"
          onClick={() => handleDownloadPDF("full")}
          disabled={downloading}
          title="상세 PDF"
        >
          🔎 자세한 PDF 다운로드
        </button>
        <button
          className="fab-btn"
          onClick={() => navigate("/")}
          title="홈으로"
        >
          🏠 홈화면으로
        </button>
      </div>
    </div>
  );
}
