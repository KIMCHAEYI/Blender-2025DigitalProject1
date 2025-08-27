// src/pages/Result/ResultPage.jsx
// 데스크톱 카드형 UI + 사람(남/여) 분리 + URL 안전보정 + (옵션) 폴링
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import axios from "axios";
import { waitForAnalysis } from "../../utils/pollDrawing";
import "./ResultPage.css";

// ===== BASE 안전 해석 (fallback: same-origin) =====
const resolveApiBase = () => {
  const raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
};
const API_BASE = resolveApiBase();

// ===== 절대/상대 URL 합성 (한글/공백/역슬래시 보정) =====
const toAbsUrl = (path) => {
  if (!path) return "";
  const s = String(path).replace(/\\/g, "/");
  if (/^data:|^blob:/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (["localhost", "127.0.0.1"].includes(u.hostname) && API_BASE) {
        const b = new URL(API_BASE);
        u.protocol = b.protocol;
        u.host = b.host;
        return u.toString();
      }
    } catch {}
    return s;
  }
  const rel = s.startsWith("/") ? s : `/${s}`;
  return API_BASE ? `${API_BASE}${encodeURI(rel)}` : encodeURI(rel);
};

// ===== 유틸 =====
const uniqByLabelMeaning = (arr = []) =>
  Array.from(
    new Map(arr.map((o) => [`${o.label}__${o.meaning ?? ""}`, o])).values()
  );

const TITLE = {
  house: "집",
  tree: "나무",
  person: "사람",
  person_male: "남자사람 그림",
  person_female: "여자사람 그림",
};
const ICON = {
  house: "🏠",
  tree: "🌳",
  person: "👤",
  person_male: "🧒",
  person_female: "👧",
};

// 한국어/영문/약어 모두 인식
const mapSubtype = (s) => {
  if (!s) return null;
  const t = String(s).trim().toLowerCase();
  if (/(^|[^a-z])(female|woman|girl|f)([^a-z]|$)/.test(t))
    return "person_female";
  if (/(^|[^a-z])(male|man|boy|m)([^a-z]|$)/.test(t)) return "person_male";
  if (t.includes("여") || t.includes("여자") || t.includes("여성"))
    return "person_female";
  if (t.includes("남") || t.includes("남자") || t.includes("남성"))
    return "person_male";
  if (t.includes("person_female") || t.includes("woman"))
    return "person_female";
  if (t.includes("person_male") || t.includes("man")) return "person_male";
  return null;
};

// 드로잉 정규화
const normalizeDrawings = (raw = {}) => {
  const out = {};
  const list = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([k, v]) => ({ ...(v || {}), _key: k }));

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

    const yolo =
      item?.yolo ||
      item?.result?.yolo ||
      (item?.result?.yolo_image ? { image: item.result.yolo_image } : null);

    const analysis =
      item?.analysis || item?.result?.analysis || item?.objects || [];

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

const sortTypes = (types) => {
  const order = {
    house: 1,
    tree: 2,
    person_female: 3,
    person_male: 4,
    person: 5,
  };
  return [...types].sort((a, b) => (order[a] || 99) - (order[b] || 99));
};

// 긴 문장 생성(의미 필드들을 자연스럽게 이어붙임)
const buildParagraph = (items = []) => {
  const texts = uniqByLabelMeaning(items)
    .map((o) => (o.meaning || "").trim())
    .filter(Boolean);
  if (!texts.length) return "";
  const uniq = Array.from(new Set(texts));
  return uniq.join(" ");
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

  const summaryChips = useMemo(() => {
    return TYPES.map((t) => {
      const items = uniqByLabelMeaning(drawingsNormalized?.[t]?.analysis || []);
      const level =
        items.length >= 8 ? "주의" : items.length >= 4 ? "보통" : "안정";
      const color =
        level === "주의" ? "#ff7675" : level === "보통" ? "#fdcb6e" : "#55efc4";
      return { type: t, label: `${TITLE[t] ?? t}`, level, color };
    });
  }, [TYPES, drawingsNormalized]);

  const [downloading, setDownloading] = useState(false);

  // 필요할 때만 폴링 (drawing_id가 있을 때만)
  useEffect(() => {
    if (!userData?.session_id) return;
    let canceled = false;
    const entries = Object.entries(drawingsNormalized);
    if (!entries.length) return;

    entries.forEach(([key, sec]) => {
      const drawingId =
        (typeof sec?.drawing_id !== "undefined" ? sec.drawing_id : null) ??
        (typeof sec?.id !== "undefined" ? sec.id : null) ??
        (typeof sec?.result?.drawing_id !== "undefined"
          ? sec.result.drawing_id
          : null);

      const hasAnalysis =
        Array.isArray(sec?.analysis) && sec.analysis.length > 0;
      if (!drawingId || hasAnalysis) return;

      (async () => {
        try {
          const result = await waitForAnalysis(userData.session_id, drawingId, {
            onTick: () => {},
          });
          if (canceled) return;
          setUserData((prev) => ({
            ...prev,
            drawings: {
              ...(prev?.drawings || {}),
              [key]: {
                ...(prev?.drawings?.[key] || {}),
                analysis: result?.analysis || [],
                yolo: result?.yolo || null,
                image:
                  result?.image ||
                  prev?.drawings?.[key]?.image ||
                  sec?.image ||
                  "",
                drawing_id: drawingId,
              },
            },
          }));
        } catch (e) {
          console.warn("waitForAnalysis failed:", key, e?.message);
        }
      })();
    });

    return () => {
      canceled = true;
    };
  }, [userData?.session_id, drawingsNormalized, setUserData]);

  // PDF 생성
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
      const para = buildParagraph(items);
      return `
        <section>
          <h2>${idx + 1}. ${TITLE[t] ?? t}</h2>
          ${
            img
              ? `<img src='${img}' alt='${TITLE[t] ?? t}'/>`
              : `<p class='muted'>(이미지 없음)</p>`
          }
          ${para ? `<p>${para}</p>` : `<p class='muted'>분석 항목 없음</p>`}
        </section>`;
    }).join("");
    const summary = `<section><h2>종합 해석</h2><p>${
      safeUser?.overall_summary || "(해석 요약 준비 중)"
    }</p></section>`;
    return `<!doctype html><html lang='ko'><head><title>HTP 검사 결과</title>${head}</head><body><h1>HTP 검사 결과 (${
      version === "summary" ? "요약" : "상세"
    })</h1>${summary}${secHtml}</body></html>`;
  };

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
        {
          html,
          filename: fn,
        }
      );
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
    <div className="result-page">
      {/* 상단: 타이틀 + 칩 + 액션버튼 */}
      <header className="result-header">
        <h1>종합 결과</h1>
        <div className="chip-row">
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
        <div className="actions">
          <button
            className="btn"
            onClick={() => handleDownloadPDF("summary")}
            disabled={downloading}
          >
            📄 간단 PDF 다운로드
          </button>
          <button
            className="btn"
            onClick={() => handleDownloadPDF("full")}
            disabled={downloading}
          >
            🔎 자세한 PDF 다운로드
          </button>
          <button className="btn" onClick={() => navigate("/")}>
            🏠 홈화면으로
          </button>
        </div>
      </header>

      {/* 종합 해석 카드 */}
      <section className="overall-card">
        <div className="overall-icon">🧭</div>
        <div className="overall-body">
          <h2>종합 해석</h2>
          <p className="overall-text" style={{ whiteSpace: "pre-line" }}>
            {safeUser.overall_summary || "(해석 준비 중)"}
          </p>
        </div>
      </section>

      {/* 그림별 카드: 2열 그리드 */}
      <section className="cards-grid">
        {[
          {
            key: "house",
            icon: ICON.house,
            title: "집 그림",
            sec: drawingsNormalized.house || {},
          },
          {
            key: "tree",
            icon: ICON.tree,
            title: "나무 그림",
            sec: drawingsNormalized.tree || {},
          },
          {
            key: "person_female",
            icon: ICON.person_female,
            title: "여자사람 그림",
            sec: drawingsNormalized.person_female || {},
          },
          {
            key: "person_male",
            icon: ICON.person_male,
            title: "남자사람 그림",
            sec: drawingsNormalized.person_male || {},
          },
        ].map(({ key, icon, title, sec }) => {
          const items = uniqByLabelMeaning(sec?.analysis || []);
          const original = toAbsUrl(sec?.image);
          const yolo = toAbsUrl(sec?.yolo?.image);
          const paragraph = buildParagraph(items);

          return (
            <article key={key} className="card">
              <header className="card-head">
                <span className="card-icon" aria-hidden>
                  {icon}
                </span>
                <div className="card-title">
                  <div className="label">{title}</div>
                  <div className="sub">객체 인식 {items.length}개</div>
                </div>
              </header>

              <div className="card-body">
                <div className="image-col">
                  <figure className="img-box">
                    {original ? (
                      <img
                        src={original}
                        alt={`${title} 원본`}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector(".img-empty")) {
                            const empty = document.createElement("div");
                            empty.className = "img-empty";
                            empty.textContent = "원본 없음";
                            parent.appendChild(empty);
                          }
                        }}
                      />
                    ) : (
                      <div className="img-empty">원본 없음</div>
                    )}
                    <figcaption>원본</figcaption>
                  </figure>

                  <figure className="img-box">
                    {yolo ? (
                      <img src={yolo} alt={`${title} 분석`} loading="lazy" />
                    ) : (
                      <div className="img-empty">분석 없음</div>
                    )}
                    <figcaption>분석</figcaption>
                  </figure>
                </div>

                <div className="text-col">
                  {paragraph ? (
                    <p className="analysis-text">{paragraph}</p>
                  ) : (
                    <p className="analysis-text muted">분석 항목이 없습니다.</p>
                  )}

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
                      <p className="muted">세부 항목이 없습니다.</p>
                    )}
                  </details>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
