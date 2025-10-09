import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Result.css";

const API_BASE = "http://172.20.6.160:5000";
console.log("✅ API_BASE:", API_BASE);

export default function RotateResultIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      // 1️⃣ 세션 ID 확인
      const sessionId =
        sessionStorage.getItem("session_id") ||
        sessionStorage.getItem("user_id");

      if (!sessionId) throw new Error("세션 ID가 없습니다.");

      console.log("📦 세션 전체 분석 요청:", sessionId);

      // 2️⃣ 전체 분석 요청
      const res = await fetch(`${API_BASE}/api/analyze/session/${sessionId}`);
      const allData = await res.json();

      console.log("🧠 세션 전체 분석 결과:", allData);

      if (!res.ok) throw new Error(allData.error || "서버 요청 실패");

      // 3️⃣ 결과 중 step2가 필요한 그림만 필터링
      const step2Targets = allData.results
        .filter((r) => r.step === 2 || r.need_step2 === true)
        .map((r) => {
          if (r.type.includes("person")) return "person"; // ✅ 남녀 구분 없이 person 통합 처리
          return r.type;
        });

      // 중복 제거
      const uniqueStep2 = [...new Set(step2Targets)];

      // 4️⃣ 2단계가 필요한 경우 → 첫 번째 대상으로 이동
      if (uniqueStep2.length > 0) {
        const firstTargetType = uniqueStep2[0];
        const target = allData.results.find(
          (r) => r.type === firstTargetType || r.subtype === firstTargetType // ✅ subtype도 함께 비교
        );

        // ✅ 백엔드에서 받은 추가 질문, 이전 그림 경로 추출
        const backendQuestion =
          target?.analysis?.extraQuestion || target?.extraQuestion || "";
        const previousDrawing = target?.path || "";

        console.log("🎯 2단계 대상:", firstTargetType);
        console.log("💬 추가 질문:", backendQuestion);
        console.log("🖼 이전 그림 경로:", previousDrawing);

        // 세션 저장 (다음 단계들용)
        sessionStorage.setItem("step2_targets", JSON.stringify(uniqueStep2));

        // ✅ 2단계 페이지로 이동 (question + 그림 함께 전달)
        navigate(`/test/step2/${firstTargetType}`, {
          state: {
            backendQuestion,
            previousDrawing,
          },
        });
      } else {
        // 모두 1단계라면 바로 결과 페이지 이동
        navigate("/result");
      }
    } catch (err) {
      console.error("❌ 전체 분석 실패:", err);
      setError("세션 전체 분석 중 오류가 발생했습니다.");
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
        disabled={loading}
      >
        {loading ? "분석 중..." : "화면을 돌렸어요!"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
