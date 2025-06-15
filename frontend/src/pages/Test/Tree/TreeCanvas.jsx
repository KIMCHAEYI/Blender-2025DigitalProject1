import React from "react";
import CanvasTemplate from "../../../components/CanvasTemplate";

export default function TreeCanvas() {
  return (
    <CanvasTemplate
      drawingType="tree"
      title="나무"
      nextRoute="/test/person/intro"
      currentStep={2}
    />
  );
}
