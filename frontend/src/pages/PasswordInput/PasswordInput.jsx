import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./PasswordInput.css";
import { useUserContext } from "../../contexts/UserContext";

export default function PasswordInput() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUserData, userData } = useUserContext();

  const handleNext = () => {
    if (password.trim()) {
      setUserData((prev) => ({
        ...prev,
        password: password.trim(),
      }));

      navigate("/character");
    }
  };

  return (
    <div className="page-center password-page">
      <h2 className="question">
        결과 다시보기를 위한
        <br />
        <span className="highlight">비밀번호</span>를 입력해 주세요
      </h2>
      <InputField
        value={password}
        onChange={setPassword}
        placeholder="비밀번호"
        className="password-input"
        type="password"
      />
      <Button onClick={handleNext}>입력했어요</Button>
    </div>
  );
}
