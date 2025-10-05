// src/pages/Result/ResultHistory.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { downloadPdf } from "../../utils/pdfUtils"; // ✅ utils 불러오기
import "./ResultHistory.css";

const latestResult = {
  name: "김채이",
  date: "2025. 04. 03",
  summary:
    "가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...",
  // 실제로는 DB에서 drawings, diagnosis, overall_summary 같은 데이터도 가져와야 함
  drawings: {},
  diagnosis: "가정 불안 관련 진단",
  overall_summary: "종합적으로 안정감 부족이 드러남",
};

export default function ResultHistory() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  // 👉 실제 데이터라면 normalize, TYPES 계산이 필요하지만
  // 지금은 예제라 더미 값으로 처리
  const drawingsNormalized = useMemo(() => latestResult.drawings || {}, []);
  const TYPES = useMemo(
    () => Object.keys(drawingsNormalized),
    [drawingsNormalized]
  );
  const totalDuration = 0; // 실제로는 ResultPage처럼 reduce로 합산 필요
  const uniqByLabelMeaning = (arr = []) =>
    Array.from(
      new Map(arr.map((o) => [`${o.label}__${o.meaning ?? ""}`, o])).values()
    );
  const TITLE = { house: "집", tree: "나무", person: "사람" };
  const formatDuration = (seconds) => `${seconds}초`;

  return (
    <div className="result-history">
      <h2 className="question">
        <span className="highlight">{latestResult.name}</span> 님의 지난 검사
        결과입니다
      </h2>

      <div className="result-card-box">
        <div className="result-card single-card">
          <h3>{latestResult.date}</h3>
          <p>{latestResult.summary}</p>
        </div>

        <div className="result-card-buttons">
          <button className="btn-detail">자세히 보기</button>
          <button
            className="btn-download"
            onClick={() =>
              downloadPdf({
                version: "summary", // 🔎 이력 페이지는 요약 PDF만
                safeUser: latestResult,
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
            {downloading ? "생성 중..." : "📄 PDF 다운로드"}
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
