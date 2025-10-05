import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Result.css";

export default function LoadingResult() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/result");
    }, 3000); // 기존 3초 유지
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="loading-page-container">
      <div className="ai-bubble">
        <div className="dot2" />
        <div className="dot2" />
        <div className="dot2" />
      </div>

      <p className="loading-text">
        <span className="highlight">AI 친구</span>가 네 그림을
        <br />
        <span className="highlight">열심히 보고 있어요</span> 👀
      </p>
    </div>
  );
}
