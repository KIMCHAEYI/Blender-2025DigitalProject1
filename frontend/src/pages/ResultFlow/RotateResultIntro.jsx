import React from "react";
import { useNavigate } from "react-router-dom";
import rotateImg from "/assets/tablet_rotate.png";
import "./Result.css";

export default function RotateResultIntro() {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate("/result/question"); // 다음 단계로 이동
  };
  return (
    <div className="page-center intro-page landscape">
      <h2 className="question">
        화면을 <span className="highlight">가로로</span> 돌려주세요
      </h2>
      <img
        src="/assets/tablet_rotate.png"
        alt="회전 중"
        className="rotate-animation-to-l"
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
