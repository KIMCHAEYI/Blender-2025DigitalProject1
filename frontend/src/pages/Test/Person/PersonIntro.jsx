// src/pages/Test/Person/PersonIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function PersonIntro() {
  const navigate = useNavigate();

  const handleSelect = (gender) => {
    sessionStorage.setItem("first_gender", gender);

    if (gender === "male") {
      navigate("/test/person/canvas-male");
    } else {
      navigate("/test/person/canvas-female");
    }
  };

  return (
    <div className="page-center intro-page portrait">
      <h2 className="question">
        그릴 <span className="highlight">사람의 성별</span>을 선택해 주세요
      </h2>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <button
          type="primary"
          className="btn-base btn-primary"
          onClick={() => handleSelect("female")}
        >
          여자 사람 그리기
        </button>
        <button
          type="primary"
          className="btn-base btn-primary"
          onClick={() => handleSelect("male")}
        >
          남자 사람 그리기
        </button>
      </div>
    </div>
  );
}
