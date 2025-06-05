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
      <p className="question">그림 속 이야기를 해석하고 있어요...</p>
    </div>
  );
}
