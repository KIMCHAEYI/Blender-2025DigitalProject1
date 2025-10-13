// src/pages/Test/step1/RotateIntro.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVoice } from "../../../contexts/VoiceContext.jsx";
import { AUDIO } from "../../../tts/AudioManifest.js";
import rotateImg from "/assets/tablet_rotate.png";
import "./TreeCanvas.css";

export default function RotateIntro() {
  const navigate = useNavigate();
  const { voice, play, isPlaying } = useVoice();

  const [audioEnded, setAudioEnded] = useState(false);

  // ✅ 페이지 진입 시 자동 재생 ("화면을 세로로 돌려주세요")
  useEffect(() => {
    const src = AUDIO["common.rotate_vertical"]?.[voice];
    if (src) {
      console.log("🎧 자동재생 시도:", src);
      play({
        src,
        onEnded: () => {
          console.log("🎧 회전 안내 음성 재생 완료");
          setAudioEnded(true); // 버튼 활성화
        },
      });
    } else {
      console.warn("⚠️ rotate_vertical 음성 없음");
      setAudioEnded(true);
    }
  }, [voice]);

  // ✅ 버튼 클릭 시 다음 페이지 이동
  const handleClick = () => {
    if (isPlaying) return; // 음성 중복 방지
    navigate("/test/tree/intro");
  };

  return (
    <div className="page-center intro-page portrait">
      <h2 className="question">
        화면을 <span className="highlight">세로로</span> 돌려주세요
      </h2>

      <img
        src={rotateImg}
        alt="회전 중"
        className="rotate-animation-to-p"
        width={200}
      />

      <button
        type="button"
        className="btn-base btn-primary"
        onClick={handleClick}
        disabled={!audioEnded || isPlaying}
      >
        {isPlaying ? "음성 안내 중..." : "화면을 돌렸어요!"}
      </button>
    </div>
  );
}
