import React from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";

export default function HouseCanvas() {
  return (
    <CanvasTemplate
      drawingType="house"
      title="집"
      nextRoute="/test/tree/rotate"
      currentStep={1}
    />
  );
}
