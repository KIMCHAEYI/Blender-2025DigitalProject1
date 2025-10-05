// src/components/PageLayout.jsx
import React from "react";
import StepIndicator from "./StepIndicator";
import NextButton from "./NextButton";
import "./PageLayout.css";

export default function PageLayout({
  step = 1,
  total = 5,
  children,
  buttonLabel = "다음",
  onNext,
  nextEnabled = true,
}) {
  return (
    <div className="page-layout">
      {/* 상단 인디케이터 */}
      <div className="page-header">
        <StepIndicator current={step} total={total} variant="kids" />
      </div>

      {/* 본문 */}
      <div className="page-content">
        <div className="content-inner">{children}</div>
      </div>

      {/* 하단 버튼 */}
      <div className="page-footer">
        <NextButton enabled={nextEnabled} onClick={onNext}>
          {buttonLabel}
        </NextButton>
      </div>
    </div>
  );
}
