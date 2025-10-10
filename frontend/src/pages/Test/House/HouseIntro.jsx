// src/pages/Test/House/HouseIntro.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js";
import "../intro.css";

export default function HouseIntro() {
  const navigate = useNavigate();
  const [canClick, setCanClick] = useState(false);

  // ✅ 페이지 진입 시 자동으로 “집을 그려주세요!” 재생
  useIntroAudio("step1.draw_house", () => setCanClick(true));

  // ✅ 다음 단계로 이동하는 함수 추가
  const handleNext = () => {
    navigate("/test/house/canvas"); // 실제 그림 그리기 페이지 경로
  };

  return (
    <div className="page-center intro-page">
      <h2 className="question">
        <span className="highlight">집</span>을 그려주세요
      </h2>
      <button
        className="btn-base btn-next"
        onClick={handleNext}
        disabled={!canClick}
      >
        알겠어요
      </button>
    </div>
  );
}
