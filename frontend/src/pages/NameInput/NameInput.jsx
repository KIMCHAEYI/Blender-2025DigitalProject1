import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./NameInput.css";
import { useUserContext } from "../../contexts/UserContext";
import StepIndicator from "../../components/StepIndicator";
import NextButton from "../../components/NextButton";

export default function NameInput() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { setUserData } = useUserContext();
  const canNext = name.trim().length > 0; // ✅ 추가

  const handleNext = () => {
    if (name.trim()) {
      setUserData((prev) => ({
        ...prev,
        name: name.trim(),
      }));

      navigate("/birth"); // 다음 페이지 경로
    }
  };

  return (
    <div className="page-center name-page">
      <StepIndicator current={1} total={5} variant="topline" />

      <h2 className="question">
        <span className="highlight">이름</span>을 입력해 주세요
      </h2>
      <InputField value={name} onChange={setName} className="name-input" />
      <NextButton enabled={canNext} onClick={handleNext}>
        입력했어요
      </NextButton>
    </div>
  );
}
