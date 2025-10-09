// ✅ src/pages/Test/step2/Step2Routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import HouseStep2Canvas from "./HouseStep2Canvas.jsx";
import TreeStep2Canvas from "./TreeStep2Canvas.jsx";
import PersonStep2Canvas from "./PersonStep2Canvas.jsx";

export default function Step2Routes() {
  return (
    <Routes>
      <Route path="house" element={<HouseStep2Canvas />} />
      <Route path="tree" element={<TreeStep2Canvas />} />
      <Route path="person" element={<PersonStep2Canvas />} />
    </Routes>
  );
}
