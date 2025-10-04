// src/pages/BirthInput/BirthInput.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import PageLayout from "../../components/PageLayout";
import "./BirthInput.css";

export default function BirthInput() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  const { setUserData } = useUserContext();
  const navigate = useNavigate();

  // 현재 연도 기준으로 100년치 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  // 월/일 옵션 생성
  const generateOptions = (start, end) => {
    const options = [];
    for (let i = start; i <= end; i++) {
      const formatted = String(i).padStart(2, "0");
      options.push(
        <option key={formatted} value={formatted}>
          {formatted}
        </option>
      );
    }
    return options;
  };

  const canNext = !!(year && month && day);

  const handleNext = () => {
    if (canNext) {
      const birthDate = `${year}-${month}-${day}`;
      setUserData((prev) => ({
        ...prev,
        birth: birthDate,
      }));
      navigate("/gender");
    }
  };

  return (
    <PageLayout
      step={2}
      total={5}
      buttonLabel="입력했어요"
      onNext={handleNext}
      nextEnabled={canNext}
    >
      <h2 className="question">
        <span className="highlight">생년월일</span>을 입력해 주세요
      </h2>

      <div className="birth-select-group">
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">년</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">월</option>
          {generateOptions(1, 12)}
        </select>

        <select value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">일</option>
          {generateOptions(1, 31)}
        </select>
      </div>
    </PageLayout>
  );
}
