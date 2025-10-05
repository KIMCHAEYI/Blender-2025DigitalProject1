import React from "react";
import { useNavigate } from "react-router-dom";

export default function TreeIntro() {
  const navigate = useNavigate();

  return (
    <div className="page-center intro-page portrait">
      <h2 className="question">
        <span className="highlight">나무</span>를 그려주세요
      </h2>

      <button
        type="primary"
        className="btn-base btn-next"
        onClick={() => navigate("/test/tree/canvas")}
      >
        알겠어요
      </button>
    </div>
  );
}
