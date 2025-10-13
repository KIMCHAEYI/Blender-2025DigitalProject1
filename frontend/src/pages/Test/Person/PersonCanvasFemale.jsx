import React, { useState } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js";

export default function PersonCanvasFemale() {
  const firstGender = sessionStorage.getItem("first_gender");
  const nextRoute =
    firstGender === "female"
      ? "/test/person/canvas-male" // 여자 먼저 그리면 → 남자
      : "/result/rotate"; // 남자 먼저 그렸으면 → 결과로 이동
  const currentStep = firstGender === "female" ? 3 : 4;

  
   const [audioEnded, setAudioEnded] = useState(false);

  // 페이지 진입 시 “여자 사람을 그려주세요” 자동재생
  useIntroAudio("step1.draw_person_female", () => setAudioEnded(true));

  return (
    <CanvasTemplate
      drawingType="person_female"
      title="사람 (여자)"
      nextRoute={nextRoute}
      currentStep={currentStep}
      // 음성 재생 끝나야 그리기 가능하도록 전달 (선택사항)
      audioEnded={audioEnded}
    />
  );
}
