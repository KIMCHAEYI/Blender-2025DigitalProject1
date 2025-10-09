// src/pages/Test/step2/Palette.jsx
import React from "react";
import { colorPalette } from "../../../utils/colorPalette.js";
import "./Palette.css";

export default function Palette({ selectedColor, onSelectColor }) {
  const colors = Object.keys(colorPalette);

  // 2개씩 세로로 묶고 싶다면
  const rows = [];
  for (let i = 0; i < colors.length; i += 2) rows.push(colors.slice(i, i + 2));

  return (
    <div className="palette-vertical">
      {rows.map((pair, i) => (
        <div key={i} className="palette-row-vertical">
          {pair.map((colorName) => {
            const rgb = colorPalette[colorName].join(",");
            const isActive = selectedColor === colorName; // 색 이름 기반 비교
            return (
              <div
                key={colorName}
                className={`color-dot ${isActive ? "active" : ""}`}
                style={{ backgroundColor: `rgb(${rgb})` }}
                onClick={() => onSelectColor(colorName)} // 색 이름으로 전달
                title={colorName}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
