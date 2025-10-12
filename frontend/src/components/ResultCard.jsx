// components/ResultCard.jsx
import React from "react";

// === 헬퍼 함수 직접 정의 ===
export const uniqByLabelMeaning = (arr = []) =>
  Array.from(
    new Map(arr.map((o) => [`${o.label}__${o.meaning ?? ""}`, o])).values()
  );

export const toAbsUrl = (path) => {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;
  const API_BASE = "http://172.20.14.232:5000";
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${encodeURI(rel)}`;
};

export default function ResultCard({ title, icon, sec, formatDuration }) {
  const items = uniqByLabelMeaning(sec?.analysis || []);
  const original = toAbsUrl(sec?.image);
  const yolo = toAbsUrl(sec?.yolo?.image);

  return (
    <article className="card" aria-label={`${title} 카드`}>
      <div className="card-head">
        <div className="title">
          <span className="icon" aria-hidden>
            {icon}
          </span>
          <div>
            <div className="label">{title} 그림</div>
            <div className="sub">
              객체 인식 {items.length}개
              {sec?.duration ? ` · ${formatDuration(sec.duration)}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* 원본 / 분석 이미지 */}
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

      {/* 전반적 설명 */}
      {sec?.counselor_summary && (
        <div className="counselor-summary">
          <h4>전반적인 설명</h4>
          <p>{sec.counselor_summary}</p>
          <p className="color-analysis"> {sec.colorAnalysis.refined} </p>
        </div>
      )}

      {/* 세부 보기 */}
      <details className="card-details">
        <summary>세부 보기</summary>
        {items.length ? (
          <ul className="object-list">
            {items.map((o, i) => (
              <li key={`${o.label}-${i}`}>
                <b>{o.label}</b>
                {o.meaning && <div className="meaning">{o.meaning}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">분석 항목이 없습니다.</p>
        )}
      </details>
    </article>
  );
}
