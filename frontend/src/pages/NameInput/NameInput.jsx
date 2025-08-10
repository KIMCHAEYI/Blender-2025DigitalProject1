import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./NameInput.css";
import { useUserContext } from "../../contexts/UserContext";

export default function NameInput() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { setUserData } = useUserContext();

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
      <h2 className="question">
        <p className="order">1/5</p>
        <span className="highlight">이름</span>을 입력해 주세요
      </h2>
      <InputField value={name} onChange={setName} className="name-input" />
      <Button type="primary" className="btn-primary" onClick={handleNext}>
        입력했어요
      </Button>
    </div>
  );
}
