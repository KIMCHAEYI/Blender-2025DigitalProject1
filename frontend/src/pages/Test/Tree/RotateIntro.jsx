import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import rotateImg from "/assets/tablet_rotate.png";
import { unlockAudio } from "../../../contexts/VoiceContext.jsx";

import "./TreeCanvas.css";

export default function RotateIntro() {
  const navigate = useNavigate();
  const [canClick, setCanClick] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    // 브라우저 정책상 자동재생이 차단될 수 있으므로
    // 여기서는 미리 Audio 객체만 생성해둠 (재생 X)
    const audio = new Audio("/audio/common.rotate_vertical.mp3");
    audio.load();
    setAudioReady(audio);
  }, []);

  const handleClick = async () => {
    unlockAudio();

    try {
      if (audioReady) {
        // ✅ 사용자 클릭 시 재생 (이 시점은 사용자 제스처!)
        await audioReady.play();
        console.log("🎧 회전 안내 오디오 재생됨");
      } else {
        console.warn("⚠️ 오디오 로드 안됨, 바로 다음 단계로 이동");
      }
    } catch (err) {
      console.warn("🔇 오디오 재생 차단됨:", err.message);
    } finally {
      // ✅ 오디오 재생 성공/실패와 관계없이 다음 페이지 이동
      navigate("/test/tree/intro");
    }
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
      >
        화면을 돌렸어요!
      </button>
    </div>
  );
}
