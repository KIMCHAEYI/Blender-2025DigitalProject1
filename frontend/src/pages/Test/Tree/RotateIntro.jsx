// src/pages/Test/Tree/RotateIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import rotateImg from "/assets/tablet_rotate.png";
import "./TreeCanvas.css";

export default function RotateIntro() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/test/tree/intro"); // 다음 단계로 이동
  };

  return (
    <div className="page-center intro-page portrait">
      <h2 className="question">
        화면을 <span className="highlight">세로로</span> 돌려주세요
      </h2>
      <img
        src="/assets/tablet_rotate.png"
        alt="회전 중"
        className="rotate-animation-to-p"
        width={200}
      />
      <button
        type="primary"
        className="btn-base btn-primary"
        onClick={handleClick}
      >
        화면을 돌렸어요!
      </button>
    </div>
  );
}
