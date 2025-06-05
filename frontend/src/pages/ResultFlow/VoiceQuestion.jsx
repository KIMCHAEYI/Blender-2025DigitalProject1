// src/pages/ResultFlow/VoiceQuestion.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VoiceQuestion() {
  const navigate = useNavigate();

  useEffect(() => {
    // 음성 녹음 시작 로직 (선택적으로 추가)
    // 예: startRecording();
  }, []);

  const handleNext = () => {
    navigate("/result/loading");
  };

  return (
    <div className="page-center landscape">
      <h2 className="question">“이 집에 살고 있는 가족은 누구인가요?”</h2>
      <img src="/assets/test_house.png" className="img-test" width={400} />
      <div className="voice-bar">🔊</div>
      <button className="btn-base btn-next" onClick={handleNext}>
        완료
      </button>
    </div>
  );
}
