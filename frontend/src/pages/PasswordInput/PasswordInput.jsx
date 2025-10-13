import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import { useUserContext } from "../../contexts/UserContext";
import PageLayout from "../../components/PageLayout";
import "./PasswordInput.css";

export default function PasswordInput() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setUserData } = useUserContext();

  const canNext = password.trim().length > 0;

  useEffect(() => {
    const handleResize = () => {
      if (document.activeElement.tagName !== "INPUT") window.scrollTo(0, 0);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = () => {
    if (!canNext) return;
    setUserData((prev) => ({ ...prev, password: password.trim() }));
    navigate("/character");
  };

  return (
    <PageLayout
      step={4}
      total={5}
      buttonLabel="입력했어요"
      onNext={handleNext}
      nextEnabled={canNext}
    >
      <h2 className="question">
        <span className="highlight">비밀번호</span>를 입력해 주세요
      </h2>

      {/* 👁️ InputField 내부에 아이콘 포함 */}
      <div className="password-wrapper">
        <InputField
          value={password}
          onChange={setPassword}
          placeholder="비밀번호"
          type={showPassword ? "text" : "password"}
          className="password-input-with-icon"
          rightIcon={
            // 💡 InputField에 전달
            <span
              className="material-icons toggle-visibility"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          }
          onKeyDown={(e) => e.key === "Enter" && canNext && handleNext()}
        />
      </div>

      <div className="password-hint">
        <span className="hint-icon">💡</span>
        비밀번호는 검사 결과를 다시 볼 때 필요해요.
        <br />
        잊지 않도록 꼭 메모해 주세요!
      </div>
    </PageLayout>
  );
}
