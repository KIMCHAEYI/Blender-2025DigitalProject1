import React from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export default function PersonCanvasMale() {
  const firstGender = sessionStorage.getItem("first_gender");
  const nextRoute =
    firstGender === "male"
      ? "/test/person/canvas-female" // 남자 먼저 그리면 → 여자
      : "/result/rotate"; // 여자 먼저 그렸으면 → 결과로 이동
  const currentStep = firstGender === "male" ? 3 : 4;

  return (
    <CanvasTemplate
      drawingType="person_male"
      title="사람 (남자)"
      nextRoute={nextRoute}
      currentStep={currentStep}
    />
  );
}
