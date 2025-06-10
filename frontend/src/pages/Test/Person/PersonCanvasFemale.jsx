import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Stage, Layer, Line } from "react-konva";
import "./PersonCanvas.css";

export default function PersonCanvasFemale() {
  const firstGender = localStorage.getItem("firstGender");
  const nextRoute =
    firstGender === "female"
      ? "/test/person/canvas-male" // 여자 먼저 그리면 → 남자
      : "/result/rotate"; // 남자 먼저 그렸으면 → 결과로 이동
  const currentStep = firstGender === "female" ? 3 : 4;

  return (
    <CanvasTemplate
      drawingType="person"
      title="사람 (여자)"
      nextRoute={nextRoute}
      currentStep={currentStep}
    />
  );
}
