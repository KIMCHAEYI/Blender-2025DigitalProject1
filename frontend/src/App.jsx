import React from "react";
import { Routes, Route } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";

import Home from "./pages/Home/Home";
import NameInput from "./pages/NameInput/NameInput";
import BirthInput from "./pages/BirthInput/BirthInput";
import GenderSelect from "./pages/GenderSelect/GenderSelect";
import PasswordInput from "./pages/PasswordInput/PasswordInput";
import CharacterSelect from "./pages/CharacterSelect/CharacterSelect";
import Complete from "./pages/Complete/Complete";

import HouseIntro from "./pages/Test/House/HouseIntro";
import HouseCanvas from "./pages/Test/House/HouseCanvas";

import RotateIntro from "./pages/Test/Tree/RotateIntro";
import TreeIntro from "./pages/Test/Tree/TreeIntro";
import TreeCanvas from "./pages/Test/Tree/TreeCanvas";

import PersonIntro from "./pages/Test/Person/PersonIntro";
import PersonCanvasMale from "./pages/Test/Person/PersonCanvasMale";
import PersonCanvasFemale from "./pages/Test/Person/PersonCanvasFemale";

import RotateResultIntro from "./pages/ResultFlow/RotateResultIntro";
import VoiceQuestion from "./pages/ResultFlow/VoiceQuestion";
import LoadingResult from "./pages/ResultFlow/LoadingResult";
import ResultPage from "./pages/Result/ResultPage";

import LoginResult from "./pages/Result/LoginResult";
import ResultHistory from "./pages/Result/ResultHistory";

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/name" element={<NameInput />} />
        <Route path="/birth" element={<BirthInput />} />
        <Route path="/gender" element={<GenderSelect />} />
        <Route path="/password" element={<PasswordInput />} />
        <Route path="/character" element={<CharacterSelect />} />
        <Route path="/complete" element={<Complete />} />

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

        <Route path="/result/rotate" element={<RotateResultIntro />} />
        <Route path="/result/question" element={<VoiceQuestion />} />
        <Route path="/result/loading" element={<LoadingResult />} />
        <Route path="/result" element={<ResultPage />} />

        <Route path="/result/login" element={<LoginResult />} />
        <Route path="/result/history" element={<ResultHistory />} />
      </Routes>
    </UserProvider>
  );
}
