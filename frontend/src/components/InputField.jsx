import React from "react";
import "./InputField.css";

export default function InputField({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  rightIcon, // 👈 추가
  ...rest
}) {
  return (
    <div className="input-field-wrapper">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-field ${className}`}
        {...rest}
      />
      {rightIcon && <div className="input-icon">{rightIcon}</div>}
    </div>
  );
}
