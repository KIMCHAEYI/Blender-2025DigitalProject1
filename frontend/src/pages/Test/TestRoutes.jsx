import React from "react";
import { Routes, Route } from "react-router-dom";

// House 단계
import HouseIntro from "./House/HouseIntro";
import HouseCanvas from "./House/HouseCanvas";

// Tree 단계
import RotateIntro from "./Tree/RotateIntro";
import TreeIntro from "./Tree/TreeIntro";
import TreeCanvas from "./Tree/TreeCanvas";

// Person 단계
import PersonIntro from "./Person/PersonIntro";
import PersonCanvasMale from "./Person/PersonCanvasMale";
import PersonCanvasFemale from "./Person/PersonCanvasFemale";

export default function TestRoutes() {
  return (
    <Routes>
      <Route path="/test/house/intro" element={<HouseIntro />} />
      <Route path="/test/house/canvas" element={<HouseCanvas />} />
      <Route path="/test/tree/rotate" element={<RotateIntro />} />
      <Route path="/test/tree/intro" element={<TreeIntro />} />
      <Route path="/test/tree/canvas" element={<TreeCanvas />} />
      <Route path="/test/person/intro" element={<PersonIntro />} />
      <Route path="/test/person/canvas-male" element={<PersonCanvasMale />} />
      <Route
        path="/test/person/canvas-female"
        element={<PersonCanvasFemale />}
      />
    </Routes>
  );
}
