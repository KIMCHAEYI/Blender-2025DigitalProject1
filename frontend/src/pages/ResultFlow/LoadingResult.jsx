// src/pages/ResultFlow/LoadingResult.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoadingResult() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/result");
    }, 3000); // 3초 후 자동 이동
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="page-center loading-page landscape">
      <div className="loading-circle"></div>
      <p className="question">
        <span className="highlight">인공지능(AI) 비전 기술</span>을 활용해
        <br></br>그림의 크기와 배치, 색채 활용을
        <span className="highlight"> 정밀 분석</span> 중입니다…
      </p>
    </div>
  );
}
