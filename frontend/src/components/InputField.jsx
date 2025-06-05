import React from "react";
import "./InputField.css";

export default function InputField({
  value,
  onChange,
  placeholder = "",
  type = "text",
  className = "",
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`input-field ${className}`}
    />
  );
}
