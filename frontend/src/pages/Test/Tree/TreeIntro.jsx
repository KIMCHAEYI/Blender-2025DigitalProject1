// src/pages/Test/Tree/TreeCanvas.jsx
import React, { useState } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js"; // 추가

export default function TreeCanvas() {
  const [audioEnded, setAudioEnded] = useState(false);

  // 🎧 페이지 진입 시 “나무를 그려주세요!” 자동재생
  useIntroAudio("step1.draw_tree", () => setAudioEnded(true));

   const handleNext = () => {
    navigate("/test/tree/canvas");
  };


  return (
    <CanvasTemplate
      drawingType="tree"
      title="나무"
      nextRoute="/test/person/intro"
      currentStep={2}
      // 음성 끝나야 그리기 시작 가능하도록 전달
      audioEnded={audioEnded}
    />
  );
}
