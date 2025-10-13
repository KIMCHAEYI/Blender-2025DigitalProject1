frontend - src - components - pages - characterselect.jsx;

// src/pages/CharacterSelect/CharacterSelect.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import { useVoice, unlockAudio } from "../../contexts/VoiceContext.jsx"; // 통합 import
import { AUDIO } from "../../tts/AudioManifest.js"; //  각 캐릭터별 음성 정보
import "./CharacterSelect.css";

export default function CharacterSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");
  const { setVoice, isPlaying, play, stop } = useVoice(); // isPlaying, play 추가

  const characters = [
    { id: "mongi", name: "몽이", emoji: "🐻" },
    { id: "gree", name: "그리", emoji: "🐰" },
  ];

  const handleNext = () => {
    if (selected && !isPlaying) {
      navigate("/complete");
    }
  };

  const handleSelect = (chId) => {
    setSelected(chId);
    setVoice(chId); //  전역 voice 설정
    unlockAudio(); // 오디오 권한 해제 (한 번만 실행되면 충분)
    stop(); // 중복 방지

    // ✅ 캐릭터 선택 시 “몽이(그리)가 함께 떠나요!” 음성 재생
    const src = AUDIO["character.start"]?.[chId];
    if (src) {
      play({ src });
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
      nextEnabled={canNext && !isPlaying}
    >
      <h2 className="question">
        <span className="highlight">캐릭터</span>를 골라주세요
      </h2>
      <p className="sub-text">
        🔊 소리를 키워주세요! 그림 여정에 몽이와 그리가 함께할 거예요.
      </p>

      <div className="character-grid">
        {characters.map((ch) => (
          <button
            key={ch.id}
            className={`character-card ${selected === ch.id ? "selected" : ""}`}
            onClick={() => handleSelect(ch.id)}
            disabled={isPlaying} // 음성 재생 중이면 버튼 클릭 불가
          >
            <span className="character-emoji">{ch.emoji}</span>
            <span className="character-name">{ch.name}</span>

            {/* 선택된 캐릭터가 음성 재생 중이면 표시 */}
            {selected === ch.id && isPlaying && (
              <span className="voice-indicator">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedChar && (
        <p className="character-message">
          {selectedChar.name}가 함께 떠나요! {selectedChar.emoji}
        </p>
      )}
    </PageLayout>
  );
}
