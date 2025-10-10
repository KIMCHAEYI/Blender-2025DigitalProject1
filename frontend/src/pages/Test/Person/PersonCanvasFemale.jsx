import React from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";

export default function PersonCanvasFemale() {
  const firstGender = sessionStorage.getItem("first_gender");
  const nextRoute =
    firstGender === "female"
      ? "/test/person/canvas-male" // 여자 먼저 그리면 → 남자
      : "/result/rotate"; // 남자 먼저 그렸으면 → 결과로 이동
  const currentStep = firstGender === "female" ? 3 : 4;

  return (
    <CanvasTemplate
      drawingType="person_female"
      title="사람 (여자)"
      nextRoute={nextRoute}
      currentStep={currentStep}
    />
  );
}
