// src/pages/Test/Tree/RotateIntro.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js"; // 자동재생 훅 import
import rotateImg from "/assets/tablet_rotate.png";
import "./TreeCanvas.css";

export default function RotateIntro() {
  const navigate = useNavigate();
  const [canClick, setCanClick] = useState(false);

  // ✅ 페이지 진입 시 “화면을 세로로 돌려주세요” 자동재생
  useIntroAudio("common.rotate_vertical", () => setCanClick(true));

  const handleClick = () => {
    if (!canClick) return; // 음성 끝나야 버튼 작동
    navigate("/test/tree/intro"); // 다음 단계로 이동
  };

  return (
    <div className="page-center intro-page portrait">
      <h2 className="question">
        화면을 <span className="highlight">세로로</span> 돌려주세요
      </h2>

      <img
        src={rotateImg}
        alt="회전 중"
        className="rotate-animation-to-p"
        width={200}
      />

      <button
        type="button"
        className="btn-base btn-primary"
        onClick={handleClick}
        disabled={!canClick} // 음성 끝나야 버튼 활성화
      >
        화면을 돌렸어요!
      </button>
    </div>
  );
}
