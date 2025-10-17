import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import { useUserContext } from "../../contexts/UserContext";
import { useVoice } from "../../contexts/VoiceContext.jsx";
import { AUDIO } from "../../tts/AudioManifest.js";
import "./Complete.css";

const API_BASE = "http://172.20.5.67:5000";

export default function Complete() {
  const { userData, setUserData } = useUserContext();
  const { voice, play, isPlaying } = useVoice();
  const navigate = useNavigate();

  const [canClick, setCanClick] = useState(false);
  const hasPlayedRef = useRef(false);

  // ✅ 페이지 입장 시 음성 자동 재생
  useEffect(() => {
    if (hasPlayedRef.current) return;
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

  // ✅ 검사 시작 버튼 클릭
  const handleSubmit = async () => {
    if (!canClick || isPlaying) return;

    try {
      console.log(
        "📤 요청 보냄:",
        `http://172.20.5.67:5000/api/sessions/start`
      );
      console.log("📦 전송 데이터:", {
        name: userData.name,
        birth: userData.birth,
        gender: userData.gender,
        password: userData.password,
      });

      const sessionRes = await axios.post(
        `http://172.20.5.67:5000/api/sessions/start`,
        {
          name: userData.name,
          birth: userData.birth,
          gender: userData.gender,
          password: userData.password,
        }
      );

      console.log("✅ 서버 응답:", sessionRes.data);

      const sid = sessionRes.data?.session_id;
      if (sid) {
        setUserData((prev) => ({ ...prev, session_id: sid }));
        sessionStorage.setItem("session_id", sid);
      }

      navigate("/test/house/intro");
    } catch (err) {
      console.error("🚨 요청 실패:", err);
      if (err.response) {
        console.error("서버 응답:", err.response.data);
      }
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
          className="btn-nextblue"
          onClick={handleSubmit}
          disabled={!canClick || isPlaying}
        >
          검사 시작하기
        </Button>
      </div>
    </div>
  );
}
