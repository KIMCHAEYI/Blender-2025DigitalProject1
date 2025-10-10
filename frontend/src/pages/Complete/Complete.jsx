// src/pages/Complete/Complete.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import { useUserContext } from "../../contexts/UserContext";
import { useVoice } from "../../contexts/VoiceContext.jsx";
import { AUDIO } from "../../tts/AudioManifest.js";
import "./Complete.css";

export default function Complete() {
  const { userData, setUserData } = useUserContext();
  const { voice, play, isPlaying } = useVoice();
  const navigate = useNavigate();

  const [canClick, setCanClick] = useState(false);
  const hasPlayedRef = useRef(false); // 재생 여부 추적

  //  페이지 로드 시 자동 재생 (단 1회)
  useEffect(() => {
    if (hasPlayedRef.current) return; // 이미 재생됐다면 종료
    hasPlayedRef.current = true;

    if (!voice) {
      console.warn("⚠️ 캐릭터(voice)가 아직 선택되지 않았습니다.");
      setCanClick(true);
      return;
    }

    const src = AUDIO["step1.start_exam"]?.[voice];
    if (!src) {
      console.warn("❌ 음성 파일을 찾을 수 없습니다:", voice);
      setCanClick(true);
      return;
    }

    console.log("🎧 자동재생 시도:", src);
    play({
      src,
      onEnded: () => {
        console.log("✅ 음성 재생 완료 — 버튼 활성화");
        setCanClick(true);
      },
    });
  }, [voice, play]);

  const handleSubmit = async () => {
    if (!canClick || isPlaying) return;

    try {
      const sessionRes = await axios.post("/api/sessions/start", {
        name: userData.name,
        birth: userData.birth,
        gender: userData.gender,
        password: userData.password,
      });

      const sid = sessionRes.data?.session_id;
      if (sid) {
        setUserData((prev) => ({ ...prev, session_id: sid }));
        sessionStorage.setItem("session_id", sid);
      }

      navigate("/test/house/intro");
    } catch (err) {
      console.error("요청 실패:", err);
      alert("처리에 실패했어요 😢 다시 시도해 주세요.");
    }
  };

  return (
    <div className="page-center complete-page">
      <h2 className="message">정보 입력이 완료되었습니다! 🎉</h2>
      <p className="description">
        이제 본격적으로 HTP 검사를 시작할 수 있어요.
        <br />
        마음을 편하게 먹고, 차분히 그림을 그려주세요.
      </p>

      <div>
        <Button
          className={`btn-nextblue`}
          onClick={handleSubmit}
          disabled={!canClick || isPlaying}
        >
          검사 시작하기
        </Button>
      </div>
    </div>
  );
}
