// ✅ src/pages/Test/step2/Step2Routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import PersonStep2Canvas from "./PersonStep2Canvas.jsx";

export default function Step2Routes() {
  return (
    <Routes>
      {/* drawingType 파라미터를 PersonStep2Canvas에서 받아 처리 */}
      <Route path=":drawingType" element={<PersonStep2Canvas />} />
    </Routes>
  );
}
