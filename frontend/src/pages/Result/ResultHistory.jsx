// src/pages/Result/ResultHistory.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./ResultHistory.css";

const dummyResults = [
  {
    date: "2025. 04. 03",
    summary: "가정에 대한 불안함이 나타나고 있습니다.",
  },
  {
    date: "2025. 01. 23",
    summary: "불안한 감정이 일부 드러났습니다.",
  },
  {
    date: "2024. 10. 31",
    summary: "감정 표현 욕구가 강하게 나타났습니다.",
  },
  {
    date: "2024. 03. 24",
    summary: "가정 문제와 관련된 내면 긴장이 발견되었습니다.",
    highlight: true,
  },
];

export default function ResultHistory() {
  const navigate = useNavigate();

  return (
    <div className="result-history">
      <h2 className="question">
        <span className="highlight">김채이</span> 님의 지난 검사 결과입니다
      </h2>

      <div className="card-slider">
        {dummyResults.map((r, idx) => (
          <div
            key={idx}
            className={`result-card ${r.highlight ? "highlighted" : ""}`}
          >
            <h3>{r.date}</h3>
            <p>{r.summary}</p>
          </div>
        ))}
      </div>

      <div className="button-wrap">
        <button className="btn-gohome" onClick={() => navigate("/")}>
          홈화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}
