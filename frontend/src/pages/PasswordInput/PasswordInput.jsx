import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import { useUserContext } from "../../contexts/UserContext";
import PageLayout from "../../components/PageLayout";
import "./PasswordInput.css";

export default function PasswordInput() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ 추가
  const navigate = useNavigate();
  const { setUserData } = useUserContext();

  const canNext = password.trim().length > 0;
  useEffect(() => {
    const handleResize = () => {
      // iPad에서 키보드 내려갈 때 화면이 위로 고정되는 현상 방지
      if (document.activeElement.tagName !== "INPUT") {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const handleNext = () => {
    if (canNext) {
      setUserData((prev) => ({
        ...prev,
        password: password.trim(),
      }));
      navigate("/character");
    }
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

      <div className="password-wrapper">
        <InputField
          value={password}
          onChange={setPassword}
          placeholder="비밀번호"
          className="password-input"
          type={showPassword ? "text" : "password"} // 👁️ 상태 반영
          onKeyDown={(e) => {
            if (e.key === "Enter" && canNext) handleNext();
          }}
        />
        <button
          type="button"
          className="toggle-visibility"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>

      {/* 💡 안내문 */}
      <div className="password-hint">
        <span className="hint-icon">💡</span>
        비밀번호는 검사 결과를 다시 볼 때 필요해요.
        <br />
        잊지 않도록 꼭 메모해 주세요!
      </div>
    </PageLayout>
  );
}
