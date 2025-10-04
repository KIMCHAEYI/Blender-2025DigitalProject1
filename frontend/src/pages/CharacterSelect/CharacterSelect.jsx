// src/pages/CharacterSelect/CharacterSelect.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import "./CharacterSelect.css";

export default function CharacterSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");

  const characters = [
    { id: "plook", name: "몽이", emoji: "🐻" },
    { id: "doongle", name: "그리", emoji: "🐰" },
  ];

  const handleNext = () => {
    if (selected) {
      navigate("/complete");
    }
  };

  const canNext = !!selected;

  const selectedChar = characters.find((ch) => ch.id === selected);

  return (
    <PageLayout
      step={5}
      total={5}
      buttonLabel="선택했어요"
      onNext={handleNext}
      nextEnabled={canNext}
    >
      <h2 className="question">
        <span className="highlight">캐릭터</span>를 골라주세요
      </h2>

      <div className="character-grid">
        {characters.map((ch) => (
          <button
            key={ch.id}
            className={`character-card ${selected === ch.id ? "selected" : ""}`}
            onClick={() => setSelected(ch.id)}
          >
            <span className="character-emoji">{ch.emoji}</span>
            <span className="character-name">{ch.name}</span>
          </button>
        ))}
      </div>

      {/* ✅ 캐릭터 선택 후 메시지 */}
      {selectedChar && (
        <p className="character-message">
          {selectedChar.name}가 함께 떠나요! {selectedChar.emoji}
        </p>
      )}
    </PageLayout>
  );
}
