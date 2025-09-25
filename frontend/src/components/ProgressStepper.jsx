import React from "react";
import "./ProgressStepper.css";

/**
 * HTP 진행 표시 (아이콘 4단계)
 * currentStep: 1~4 (현재 진행 단계, 1-base)
 */
export default function ProgressStepper({ currentStep = 1 }) {
  const stages = ["🏠", "🌳", "👦", "👫"];

  return (
    <nav className="htp-progress" aria-label="진행 단계">
      {stages.map((emoji, idx) => {
        const step = idx + 1;
        const active = step <= currentStep;
        return (
          <div
            key={step}
            className={`htp-progress__stage ${active ? "is-active" : ""}`}
            aria-current={step === currentStep ? "step" : undefined}
          >
            <span className="htp-progress__icon">{emoji}</span>
          </div>
        );
      })}
    </nav>
  );
}
