import { useNavigate } from "react-router-dom";
import React from "react";
import "./HouseCanvas.css";

export default function HouseIntro() {
  const navigate = useNavigate();

  return (
    <div className="page-center intro-page">
      <h2 className="question">
        <span className="highlight">집</span>을 그려주세요
      </h2>
      <button
        type="primary"
        className="btn-base btn-next"
        onClick={() => navigate("/test/house/canvas")}
      >
        알겠어요
      </button>
    </div>
  );
}
