// src/pages/Result/LoginResult.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./LoginResult.css";

export default function LoginResult() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (name.trim() && password.trim()) {
      navigate("/result/history");
    }
  };

  return (
    <div className="page-center">
      <h2 className="question">지난 검사 결과 열람하기</h2>
      <p className="subtext">
        지난 검사 결과 열람을 위해 검사자의 이름과 비밀번호를 입력해 주세요.
      </p>

      <InputField
        value={name}
        onChange={setName}
        placeholder="이름"
        className="login-result"
      />
      <InputField
        value={password}
        onChange={setPassword}
        placeholder="비밀번호"
        type="password"
        className="login-result"
      />

      <Button type="primary" className="btn-primary" onClick={handleSubmit}>
        입력했어요
      </Button>
    </div>
  );
}
