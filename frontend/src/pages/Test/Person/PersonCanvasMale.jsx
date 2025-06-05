import React from "react";
import { useNavigate } from "react-router-dom";

import "./PersonCanvas.css";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export default function PersonCanvasFemale() {
  const navigate = useNavigate();
  const first = localStorage.getItem("firstGender");

  const handleNext = () => {
    if (first === "male") {
      navigate("/test/person/canvas-female");
    } else {
      navigate("/result/rotate");
    }
  };

  const isFirst = first === "male";
  const activeCount = isFirst ? 3 : 4;
  const totalDots = 4;
  const buttonText = isFirst ? "다음으로 →" : "검사완료 →";

  return (
    <div className="canvas-page">
      <div className="progress-indicator">
        {[...Array(totalDots)].map((_, idx) => (
          <span
            key={idx}
            className={`dot ${idx < activeCount ? "active" : ""}`}
          />
        ))}
      </div>

      <div className="canvas-header-card">
        <h2>남자 사람</h2>
      </div>

      <div className="canvas-body">
        {/* 툴바 */}
        <div className="toolbar">
          <button className="active">✏️ 펜</button>
          <button>🧽 지우개</button>
          <button>🔄 새로 그리기</button>
        </div>
        <div className="canvas-wrapper">
          <Stage
            width={A4_WIDTH}
            height={A4_HEIGHT}
            style={{
              background: "#fff",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              margin: "20px 0",
            }}
          >
            <Layer>
              <Rect width={A4_WIDTH} height={A4_HEIGHT} fill="#ffffff" />
            </Layer>
          </Stage>
        </div>
      </div>

      <button onClick={handleNext} className="btn-base next-button">
        {buttonText}
      </button>
    </div>
  );
}
