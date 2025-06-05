// src/pages/BirthInput/BirthInput.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import "./BirthInput.css";
import { useUserContext } from "../../contexts/UserContext";

export default function BirthInput() {
  // 상태 저장: 선택된 연/월/일
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  const { setUserData } = useUserContext();

  const navigate = useNavigate(); // 페이지 이동 훅

  // 현재 연도를 기준으로 최신순 연도 배열 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i); // [2025, 2024, ..., 1926]

  // 월/일 옵션을 생성하는 함수
  const generateOptions = (start, end) => {
    const options = [];
    for (let i = start; i <= end; i++) {
      const formatted = String(i).padStart(2, "0"); // 1 → 01
      options.push(
        <option key={formatted} value={formatted}>
          {formatted}
        </option>
      );
    }
    return options;
  };

  // 다음 페이지 이동 처리
  const handleNext = () => {
    if (year && month && day) {
      const birthDate = `${year}-${month}-${day}`;

      setUserData((prev) => ({
        ...prev,
        birth: birthDate,
      }));

      navigate("/gender");
    }
  };

  return (
    <div className="page-center birth-page page-no-scroll">
      <h2 className="question">
        <span className="highlight">생년월일</span>을 입력해 주세요
      </h2>

      <div className="birth-select-group">
        {/* 최신 연도 → 과거 순 */}
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">년</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* 월은 01~12 */}
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">월</option>
          {generateOptions(1, 12)}
        </select>

        {/* 일은 01~31 */}
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">일</option>
          {generateOptions(1, 31)}
        </select>
      </div>

      <Button
        type="primary"
        className="btn-base btn-primary"
        onClick={handleNext}
      >
        입력했어요
      </Button>
    </div>
  );
}
