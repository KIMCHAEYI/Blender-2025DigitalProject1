// src/pages/ResultFlow/RotateResultIntro.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVoice } from "../../contexts/VoiceContext.jsx";
import { AUDIO } from "../../tts/AudioManifest.js";
import "./Result.css";

const API_BASE = "http://172.30.1.71:5000";
console.log("✅ API_BASE:", API_BASE);

export default function RotateResultIntro() {
  const navigate = useNavigate();
  const { voice, play, isPlaying } = useVoice();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioEnded, setAudioEnded] = useState(false);

  // ✅ 1️⃣ 페이지 진입 시 자동재생: "화면을 가로로 돌려주세요"
  useEffect(() => {
    const src = AUDIO["common.rotate_horizontal"]?.[voice];
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
      setAudioEnded(true);
    }
  }, [voice]);

  // ✅ 2️⃣ 버튼 클릭 시: "AI 분석 중입니다" 재생 → 끝나면 handleAnalyze 실행
  const handleClick = async () => {
    if (isPlaying || loading) return; // 중복 방지
    setLoading(true);
    setError("");

    const src = AUDIO["common.ai_analyzing"]?.[voice];
    if (src) {
      play({
        src,
        onEnded: () => {
          console.log("🎧 AI 분석 멘트 재생 완료 → 실제 요청 시작");
          handleAnalyze(); // 음성 끝나면 분석 실행
        },
      });
    } else {
      handleAnalyze();
    }
  };

  // ✅ 3️⃣ 실제 API 호출 (원본 handleClick 로직 그대로 유지)
  const handleAnalyze = async () => {
    try {
      const sessionId =
        sessionStorage.getItem("session_id") ||
        sessionStorage.getItem("user_id");

      if (!sessionId) throw new Error("세션 ID가 없습니다.");

      console.log("📦 세션 전체 분석 요청:", sessionId);

      let retries = 0;
      let allData = null;
      while (retries < 10) {
        console.log(`⏳ 대기중... (${retries + 1}/10)`);
        const res = await fetch(`${API_BASE}/api/analyze/session/${sessionId}`);
        allData = await res.json();

        if (res.ok && allData?.results && allData.results.length > 0) {
          console.log("✅ 세션 전체 분석 완료:", allData);
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
        retries++;
      }

      if (!allData || !allData.results || allData.results.length === 0) {
        throw new Error("세션 분석 결과를 불러오지 못했습니다.");
      }

      const step2Targets = allData.results
        .filter((r) => r.step === 2 || r.need_step2 === true)
        .map((r) => {
          if (r.type.includes("person")) return "person";
          return r.type;
        });

      const uniqueStep2 = [...new Set(step2Targets)];
      console.log("🎯 2단계 대상:", uniqueStep2);

      if (uniqueStep2.length > 0) {
        const firstTargetType = uniqueStep2[0];
        const target = allData.results.find(
          (r) => r.type === firstTargetType || r.subtype === firstTargetType
        );

        const backendQuestion =
          target?.analysis?.extraQuestion || target?.extraQuestion || "";
        const previousDrawing = target?.path || "";

        sessionStorage.setItem("step2_targets", JSON.stringify(uniqueStep2));

        navigate(`/test/step2/${firstTargetType}`, {
          state: {
            backendQuestion,
            previousDrawing,
          },
        });
      } else {
        navigate("/result");
      }
    } catch (err) {
      console.error("❌ 전체 분석 실패:", err);
      setError("세션 분석 결과를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center intro-page landscape">
      <h2 className="question">
        화면을 <span className="highlight">가로로</span> 돌려주세요
      </h2>

      <img
        src="/assets/tablet_rotate.png"
        alt="회전 중"
        className="rotate-animation-to-l"
        width={200}
      />

      <button
        type="primary"
        className="btn-base btn-primary"
        onClick={handleClick}
        disabled={!audioEnded || isPlaying || loading}
      >
        {loading ? "분석 중..." : "화면을 돌렸어요!"}
      </button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
