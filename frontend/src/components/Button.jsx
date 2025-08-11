import React from "react";
import "./Button.css";

/**
 * 재사용 가능한 버튼 컴포넌트
 *
 * @param {function} onClick - 클릭 이벤트 핸들러
 * @param {string} type - 버튼 스타일: "primary", "secondary", "next"
 * @param {string} className - 추가 커스텀 클래스
 * @param {ReactNode} children - 버튼 안에 들어갈 내용
 */
export default function Button({
  onClick,
  type = "primary",
  className = "",
  children,
  disabled = false,
}) {
  const typeClass =
    {
      primary: "btn-primary",
      secondary: "btn-secondary",
      next: "btn-next",
    }[type] || "btn-primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-base ${typeClass} ${className}`}
    >
      {children}
    </button>
  );
}
