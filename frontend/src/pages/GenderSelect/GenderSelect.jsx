// src/pages/GenderSelect/GenderSelect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import PageLayout from "../../components/PageLayout"; // ✅ 공통 레이아웃
import "./GenderSelect.css";

export default function GenderSelect() {
  const [gender, setGender] = useState("");
  const navigate = useNavigate();
  const { setUserData } = useUserContext();

  const canNext = !!gender;

  const handleSelect = (value) => {
    setGender(value);
  };

  const handleNext = () => {
    if (gender) {
      setUserData((prev) => ({
        ...prev,
        gender,
      }));
      navigate("/password");
    }
  };

  return (
    <PageLayout
      step={3}
      total={5}
      buttonLabel="선택했어요"
      onNext={handleNext}
      nextEnabled={canNext}
    >
      <h2 className="question">
        <span className="highlight">성별</span>을 선택해 주세요
      </h2>

      <div className="gender-options">
        {["남자", "여자"].map((option) => (
          <button
            key={option}
            className={`gender-button btn-secondary ${
              gender === option ? "selected" : ""
            }`}
            onClick={() => handleSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </PageLayout>
  );
}
