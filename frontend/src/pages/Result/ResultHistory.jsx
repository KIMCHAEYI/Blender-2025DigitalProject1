// src/pages/Result/ResultHistory.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./ResultHistory.css";

const latestResult = {
  name: "김채이",
  date: "2025. 04. 03",
  summary:
    "가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...가정에 대한 불안함이 나타나고 있습니다. 뭐 이런 식으로 초반 내용만 보여주...",
};

export default function ResultHistory() {
  const navigate = useNavigate();

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
          <button className="btn-download">PDF 다운로드</button>
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
