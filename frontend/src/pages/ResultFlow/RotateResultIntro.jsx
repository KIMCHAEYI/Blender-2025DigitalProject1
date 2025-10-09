// src/pages/Result/RotateResultIntro.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Result.css";

const API_BASE = "http://172.20.6.160:5000";
console.log("✅ API_BASE:", API_BASE);

export default function RotateResultIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  console.log("📂 RotateResultIntro 시작");
  console.log("📂 latest_file:", sessionStorage.getItem("latest_file"));
  console.log("📂 latest_type:", sessionStorage.getItem("latest_type"));
  console.log("📂 session_id:", sessionStorage.getItem("session_id"));

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      // 세션 및 파일 정보 가져오기
      const fileName = sessionStorage.getItem("latest_file")?.split("/").pop();
      const drawingType =
        sessionStorage.getItem("latest_type")?.toLowerCase() || "house";

      if (!fileName) throw new Error("업로드된 그림 파일이 없습니다.");

      console.log(
        "📤 요청:",
        `${API_BASE}/api/analyze?file=${fileName}&type=${drawingType}`
      );

      const res = await fetch(
        `${API_BASE}/api/analyze?file=${fileName}&type=${drawingType}`
      );
      const data = await res.json();

      console.log("📥 응답 원본:", data);

      if (!res.ok) throw new Error(data.error || "서버 요청 실패");

      // ✅ need_step2, targets 추출
      const needStep2 =
        data.need_step2 ?? data.needStep2 ?? data.step2_needed ?? false;
      const targets =
        data.targets ?? data.target ?? (data.type ? [data.type] : []) ?? [];

      console.log("🧩 needStep2:", needStep2, "| targets:", targets);

      // ✅ 🔥 분석 결과 누적 저장 및 전체 출력
      const prevAnalyzes = JSON.parse(
        sessionStorage.getItem("analyzeResults") || "{}"
      );
      const updatedAnalyzes = {
        ...prevAnalyzes,
        [drawingType]: {
          need_step2: needStep2,
          objects: data.objects?.length || 0,
          subtype: data.subtype,
        },
      };
      sessionStorage.setItem("analyzeResults", JSON.stringify(updatedAnalyzes));

      console.log("📊 전체 분석 상태 누적:");
      Object.entries(updatedAnalyzes).forEach(([key, val]) => {
        console.log(
          `🔹 ${key} → need_step2: ${val.need_step2}, objects: ${val.objects}, subtype: ${val.subtype}`
        );
      });

      // ✅ 2단계 분기
      if (needStep2 && targets.length > 0) {
        sessionStorage.setItem("step2_targets", JSON.stringify(targets));
        navigate(`/test/step2/${targets[0]}`);
      } else {
        navigate("/result");
      }
    } catch (err) {
      console.error("❌ 2단계 판단 실패:", err);
      setError("2단계 진행 여부를 확인할 수 없습니다.");
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
        {loading ? "확인 중..." : "화면을 돌렸어요!"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
