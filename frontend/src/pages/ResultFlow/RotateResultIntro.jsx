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
      console.log("요청 URL:", `${API_BASE}/api/analyze/session/${sessionId}`);

      // 2️⃣ YOLO가 아직 저장 중일 수 있으므로 polling (최대 10초, 1초마다 재시도)
      let retries = 0;
      let allData = null;
      while (retries < 10) {
        console.log(`⏳ 대기중... (${retries + 1}/10)`);

        const res = await fetch(`${API_BASE}/api/analyze/session/${sessionId}`);
        allData = await res.json();

        // 응답이 성공이고 results가 비어있지 않으면 종료
        if (res.ok && allData?.results && allData.results.length > 0) {
          console.log("✅ 세션 전체 분석 완료:", allData);
          break;
        }

        // 결과가 아직 비어있다면 1초 대기 후 재시도
        await new Promise((r) => setTimeout(r, 1000));
        retries++;
      }

      if (!allData || !allData.results || allData.results.length === 0) {
        throw new Error("세션 분석 결과를 불러오지 못했습니다.");
      }

      // 3️⃣ 2단계가 필요한 그림만 필터링
      const step2Targets = allData.results
        .filter((r) => r.step === 2 || r.need_step2 === true)
        .map((r) => {
          if (r.type.includes("person")) return "person"; // ✅ 남녀 통합
          return r.type;
        });

      const uniqueStep2 = [...new Set(step2Targets)];
      console.log("🎯 2단계 대상:", uniqueStep2);

      // 4️⃣ 2단계 대상이 있으면 해당 페이지로 이동
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
        // 전부 1단계면 결과 페이지로 이동
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
        disabled={loading}
      >
        {loading ? "분석 중..." : "화면을 돌렸어요!"}
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
