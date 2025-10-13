import React, { useState } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";
import { useIntroAudio } from "../../../hooks/useIntroAudio.js";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export default function PersonCanvasMale() {
  const firstGender = sessionStorage.getItem("first_gender");
  const nextRoute =
    firstGender === "male"
      ? "/test/person/canvas-female" // 남자 먼저 그리면 → 여자
      : "/result/rotate"; // 여자 먼저 그렸으면 → 결과로 이동
  const currentStep = firstGender === "male" ? 3 : 4;

   const [audioEnded, setAudioEnded] = useState(false);

  // 페이지 진입 시 “남자 사람을 그려주세요” 자동재생
  useIntroAudio("step1.draw_person_male", () => setAudioEnded(true));

  return (
    <CanvasTemplate
      drawingType="person_male"
      title="사람 (남자)"
      nextRoute={nextRoute}
      currentStep={currentStep}
        // 음성 재생 끝나야 그리기 가능하도록 전달 (선택사항)
      audioEnded={audioEnded}
    />
  );
}
