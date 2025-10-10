// src/pages/Test/Person/PersonIntro.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js"; // 추가

export default function PersonIntro() {
  const navigate = useNavigate();
  const [audioEnded, setAudioEnded] = useState(false);

  // 🎧 페이지 진입 시 “그릴 사람의 성별을 선택해 주세요” 음성 자동재생
  useIntroAudio("step1.select_gender", () => setAudioEnded(true));

  const handleSelect = (gender) => {
    if (!audioEnded) return; // 음성이 끝나야 선택 가능 (선택사항)

    localStorage.setItem("firstGender", gender);

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
          disabled={!audioEnded} // 음성 끝나야 활성화
        >
          여자 사람 그리기
        </button>

        <button
          type="primary"
          className="btn-base btn-primary"
          onClick={() => handleSelect("male")}
          disabled={!audioEnded} // 음성 끝나야 활성화
        >
          남자 사람 그리기
        </button>
      </div>
    </div>
  );
}
