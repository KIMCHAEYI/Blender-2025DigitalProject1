import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import "./GenderSelect.css";
import { useUserContext } from "../../contexts/UserContext";

export default function GenderSelect() {
  const [gender, setGender] = useState("");
  const navigate = useNavigate();
  const { setUserData, userData } = useUserContext();

  const handleSelect = (value) => {
    setGender(value);
  };

  const handleNext = () => {
    if (gender) {
      setUserData((prev) => ({
        ...prev,
        gender: gender,
      }));

      navigate("/password");
    }
  };

  return (
    <div className="page-center gender-page">
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

      <Button type="primary" className="btn-primary" onClick={handleNext}>
        선택했어요
      </Button>
    </div>
  );
}
