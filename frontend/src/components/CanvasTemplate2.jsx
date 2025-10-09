import React, { useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../contexts/UserContext.jsx";
import { generateSafePngFileName } from "../utils/generateFileName.js";
import { dataURLtoFile } from "../utils/dataURLtoFile";
import "./CanvasTemplate.css";

// ✅ 백엔드 주소 고정
const API_BASE = "http://172.20.6.160:5000";

export default function CanvasTemplate2({
  drawingType = "house",
  backendQuestion = "",
  previousDrawing = "",
}) {
  const { userData } = useUserContext();
  const navigate = useNavigate();

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef();

  const sessionId =
    userData?.session_id ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("user_id");

  const step2Targets = JSON.parse(
    sessionStorage.getItem("step2_targets") || "[]"
  );
  const currentIndex = step2Targets.indexOf(drawingType);
  const nextTarget = step2Targets[currentIndex + 1];
  const nextRoute = nextTarget ? `/test/step2/${nextTarget}` : "/result";

  // ======= 분석 완료 대기 함수 =======
  // ✅ 분석 완료 대기 + 실패 시 자동 진행 버전
  async function waitForAnalysis(sessionId, type, navigateNext) {
    const API_BASE = "http://172.20.6.160:5000";
    let retries = 0;

    console.log("🔍 분석 완료 대기 시작:", { sessionId, type });

    while (retries < 15) {
      try {
        const res = await fetch(
          `${API_BASE}/api/analyze/status?session_id=${sessionId}&type=${type}`
        );
        const data = await res.json();

        if (data?.status === "ready" || data?.need_step2 !== undefined) {
          console.log("✅ 분석 완료 감지:", data);
          return true; // 완료됨
        }

        console.log(`⏳ 분석 대기중... (${retries + 1}/15)`);
      } catch (err) {
        console.warn("⚠️ 분석 상태 확인 실패:", err);
      }

      await new Promise((r) => setTimeout(r, 1000)); // 1초 대기
      retries++;
    }

    // 15초(15회) 기다렸는데도 완료 신호가 없으면 자동 진행
    console.warn("⚠️ 분석 완료 신호 없음 — 자동으로 다음 단계로 진행합니다.");
    if (typeof navigateNext === "function") navigateNext(); // 안전하게 다음 단계로 이동
    return false;
  }

  // ======= 저장 및 분석 완료 대기 =======
  const handleSave = async () => {
    if (!sessionId) {
      alert("세션이 유효하지 않습니다.");
      return;
    }

    const stage = stageRef.current;
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const file = dataURLtoFile(
      dataURL,
      generateSafePngFileName(sessionId, drawingType)
    );

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("type", drawingType);
    formData.append("drawing", file);

    setSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/drawings/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("📦 서버 응답:", res.data);

      // ✅ 응답에서 path, file_path, url, message 어떤 형태든 다 잡기
      const uploadedPath =
        res.data?.path ||
        res.data?.file_path ||
        res.data?.url ||
        res.data?.savedPath ||
        "";

      // ✅ path가 없으면 우리가 직접 생성
      const uploadedFile =
        uploadedPath.split("/").pop() ||
        generateSafePngFileName(sessionId, drawingType);

      console.log("💾 업로드 파일명:", uploadedFile);

      // ✅ 저장
      sessionStorage.setItem("latest_file", uploadedFile);
      sessionStorage.setItem("latest_type", drawingType);

      // ✅ 반영 대기 후 다음 이동
      await new Promise((r) => setTimeout(r, 300));
      handleNext();
    } catch (err) {
      console.error("❌ 업로드 오류:", err);
      alert("파일 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleNext = () => {
    if (nextTarget) {
      navigate(nextRoute);
    } else {
      navigate("/result/rotate");
    }
  };

  return (
    <div className="canvas-page">
      <h2 className="question-title">
        {backendQuestion || "질문을 불러오는 중입니다..."}
      </h2>

      <div className="canvas-wrapper">
        {previousDrawing && (
          <img src={previousDrawing} alt="이전 그림" className="prev-drawing" />
        )}
        <Stage
          width={window.innerWidth}
          height={window.innerHeight * 0.7}
          ref={stageRef}
          onMouseDown={(e) => {
            setIsDrawing(true);
            const pos = e.target.getStage().getPointerPosition();
            setLines([...lines, { points: [pos.x, pos.y] }]);
          }}
          onMouseMove={(e) => {
            if (!isDrawing) return;
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            let lastLine = lines[lines.length - 1];
            lastLine.points = lastLine.points.concat([point.x, point.y]);
            lines.splice(lines.length - 1, 1, lastLine);
            setLines(lines.concat());
          }}
          onMouseUp={() => setIsDrawing(false)}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke="#000"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      <button
        className="btn-base btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "저장 및 분석 중..." : "저장하고 다음으로 →"}
      </button>
    </div>
  );
}
