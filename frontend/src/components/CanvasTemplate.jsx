// src/components/CanvasTemplate.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../contexts/UserContext.jsx";
import { generateSafePngFileName } from "../utils/generateFileName.js";
import { dataURLtoFile } from "../utils/dataURLtoFile";
import "./CanvasTemplate.css";

// ===== API BASE 설정 =====
const resolveApiBase = () => {
  let raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null" || raw === "") {
    raw = "http://172.20.6.160:5000"; // ✅ 기본값
  }
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://172.20.6.160:5000";
  }
};
const API_BASE = resolveApiBase();

export default function CanvasTemplate({
  drawingType,
  nextRoute,
  title,
  currentStep,
}) {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const headerRef = useRef(null);
  const toolbarRef = useRef(null);
  const wrapperRef = useRef(null);
  const footerRef = useRef(null);

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const levels = [2, 4, 8];
  const [penSize, setPenSize] = useState(levels[1]);
  const [canvasWidth, setCanvasWidth] = useState(1123);
  const [eraseCount, setEraseCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);

  const totalSteps = 4;
  const isHorizontal = drawingType === "house";
  const BASE_WIDTH = isHorizontal ? 1123 : 794;
  const BASE_HEIGHT = isHorizontal ? 794 : 1123;

  const { userData, setUserData } = useUserContext();
  const [startTime] = useState(Date.now());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // 펜 굵기 기록
  const [penUsageHistory, setPenUsageHistory] = useState({
    thin: 0,
    normal: 0,
    thick: 0,
  });
  const thicknessMap = { 2: "thin", 4: "normal", 8: "thick" };

  // 굵기 조절
  const increasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx < levels.length - 1) setPenSize(levels[idx + 1]);
  };
  const decreasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx > 0) setPenSize(levels[idx - 1]);
  };

  // 가이드 최초 표시
  useEffect(() => {
    const seen = localStorage.getItem("seenToolbarGuideV2");
    if (!seen) {
      setShowGuide(true);
      localStorage.setItem("seenToolbarGuideV2", "true");
    }
  }, []);

  // 캔버스 크기 자동조정
  useEffect(() => {
    const aspect = BASE_WIDTH / BASE_HEIGHT;
    const measureAndSet = () => {
      const headerH = headerRef.current?.getBoundingClientRect().height || 0;
      const toolbarW = toolbarRef.current?.getBoundingClientRect().width || 0;
      const footerRect = footerRef.current?.getBoundingClientRect();
      const footerH = footerRect?.height || 0;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const H_GUTTER = 24;
      const V_GUTTER = 24;
      const availW = Math.max(0, screenW - toolbarW - H_GUTTER * 2);
      const availH = Math.max(0, screenH - headerH - footerH - V_GUTTER * 2);
      const widthIfHeightLimited = availH * aspect;
      setCanvasWidth(Math.floor(Math.min(availW, widthIfHeightLimited)));
    };
    measureAndSet();
    const ro = new ResizeObserver(measureAndSet);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [BASE_WIDTH, BASE_HEIGHT]);

  // 버튼 이벤트
  const handleCancelClick = () => setShowCancelModal(true);
  const handleCancelConfirm = () => navigate("/");
  const handleNextClick = () => setShowSubmitModal(true);

  // 핵심 로직
  const handleNext = async () => {
    if (!stageRef.current) return;

    const sid =
      userData?.session_id ||
      sessionStorage.getItem("session_id") ||
      sessionStorage.getItem("user_id");

    if (!sid) {
      alert("세션이 없습니다. 검사 시작(로그인/정보 입력)부터 해주세요.");
      navigate("/");
      return;
    }

    try {
      // 1️⃣ 그림 캡처
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const fileName = generateSafePngFileName(userData || {}, drawingType);
      const file = dataURLtoFile(dataURL, fileName);

      // 2️⃣ 업로드 데이터 구성
      const formData = new FormData();
      formData.append("drawing", file);
      formData.append("type", drawingType);
      formData.append("session_id", sid);
      formData.append("eraseCount", String(eraseCount));
      formData.append("resetCount", String(resetCount));
      formData.append(
        "duration",
        String(Math.floor((Date.now() - startTime) / 1000))
      );
      formData.append("penUsage", JSON.stringify(penUsageHistory));

      console.log("📤 업로드 시작:", drawingType);
      const uploadRes = await axios.post(
        `${API_BASE}/api/drawings/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const data = uploadRes.data || {};
      console.log("✅ 업로드 완료:", data);

      const imagePath = data.path || data.result?.path || data.file_path || "";
      const fileOnly = imagePath.split("/").pop();

      // 3️⃣ YOLO 분석 요청
      const analyze = async () =>
        axios.get(`${API_BASE}/api/analyze`, {
          params: { file: fileOnly, type: drawingType, session_id: sid },
          timeout: 15000,
        });

      try {
        console.log("🧠 YOLO 분석 요청:", fileOnly);
        await analyze();
      } catch {
        console.warn("⚠️ YOLO 첫 시도 실패 → 재시도 중");
        await new Promise((r) => setTimeout(r, 300));
        await analyze();
      }

      // 4️⃣ 사용자 데이터 갱신
      setUserData((prev) => ({
        ...(prev || {}),
        session_id: sid,
        drawings: {
          ...(prev?.drawings || {}),
          [drawingType]: {
            image: imagePath,
            eraseCount,
            resetCount,
            duration: Math.floor((Date.now() - startTime) / 1000),
          },
        },
      }));

      // 5️⃣ 다음 페이지 이동
      if (nextRoute && nextRoute.includes("step2")) navigate("/result/rotate");
      else if (nextRoute) navigate(nextRoute);
      else navigate("/result/rotate");
    } catch (err) {
      console.error("❌ 업로드 또는 분석 실패:", err);
      alert(
        "그림 업로드 또는 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  };

  // 그리기 핸들러
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const thickness = thicknessMap[penSize];
    setPenUsageHistory((p) => ({ ...p, [thickness]: p[thickness] + 1 }));
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const pos = { x: pointer.x / scale, y: pointer.y / scale };
    setLines((p) => [
      ...p,
      { points: [pos.x, pos.y], stroke: "#111", strokeWidth: penSize },
    ]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const pos = { x: pointer.x / scale, y: pointer.y / scale };
    setLines((p) => {
      const last = p[p.length - 1];
      const updated = { ...last, points: [...last.points, pos.x, pos.y] };
      return [...p.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => setIsDrawing(false);
  const handleUndo = () => setLines((p) => p.slice(0, -1));
  const handleClear = () => setLines([]);

  const scale = canvasWidth / BASE_WIDTH;

  return (
    <div className="page-center house-page">
      {/* 헤더 */}
      <div className="canvas-header-row" ref={headerRef}>
        <div className="rectangle-header">
          <h2 className="rectangle-title">{title}</h2>
        </div>
      </div>

      {/* 바디 */}
      <div className="canvas-body" ref={wrapperRef}>
        <div className="toolbar" ref={toolbarRef}>
          <div className="pen-stepper">
            <button onClick={increasePen} title="굵기 늘리기">
              <img
                src="/assets/+.png"
                alt="굵기 늘리기"
                width={45}
                height={45}
              />
            </button>
            <div
              style={{
                width: 45,
                height: 45,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "8px 0",
              }}
            >
              <div
                style={{
                  width: penSize * 1.5,
                  height: penSize * 1.5,
                  borderRadius: "50%",
                  background: "#111",
                }}
              />
            </div>
            <button onClick={decreasePen} title="굵기 줄이기">
              <img
                src="/assets/-.png"
                alt="굵기 줄이기"
                width={45}
                height={45}
              />
            </button>
          </div>

          <img
            className="icon-oneback"
            src="/images/oneback.png"
            alt="되돌리기"
            onClick={handleUndo}
          />
          <img
            className="icon-trash"
            src="/images/trash.png"
            alt="처음부터"
            onClick={handleClear}
          />
          <img
            className="icon-help"
            src="/images/question.png"
            alt="도움말"
            onClick={() => setShowGuide(true)}
          />
        </div>

        <div className="canvas-wrapper">
          <div className="progress-indicator static-overlay">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`dot ${i < currentStep ? "active" : ""}`}
              />
            ))}
          </div>

          <Stage
            width={canvasWidth}
            height={(canvasWidth * BASE_HEIGHT) / BASE_WIDTH}
            scale={{ x: scale, y: scale }}
            className="drawing-canvas"
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={BASE_WIDTH}
                height={BASE_HEIGHT}
                fill="white"
              />
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* 푸터 */}
      <div className="footer-buttons-row" ref={footerRef}>
        <button className="btn-base btn-nextred" onClick={handleCancelClick}>
          검사 그만두기
        </button>
        <button className="btn-base btn-nextblue" onClick={handleNextClick}>
          다음으로
        </button>
      </div>

      {/* 제출 모달 */}
      {showSubmitModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSubmitModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>제출할까요?</h3>
            <p>제출 후에는 그림을 수정할 수 없어요</p>
            <div className="modal-buttons">
              <button
                className="modal-button confirm"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleNext();
                }}
              >
                확인
              </button>
              <button
                className="modal-button cancel"
                onClick={() => setShowSubmitModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 취소 모달 */}
      {showCancelModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>나중에 다시 할래요</h3>
            <p>지금 멈추면 처음부터 다시 시작해요</p>
            <div className="modal-buttons">
              <button
                className="modal-button confirm"
                onClick={handleCancelConfirm}
              >
                확인
              </button>
              <button
                className="modal-button cancel"
                onClick={() => setShowCancelModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도움말 모달 */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✨ 그림 도구 사용법</h3>
            <ul style={{ textAlign: "left", padding: "0 1rem" }}>
              <li>✏️ 굵기: 얇게 / 중간 / 굵게</li>
              <li>↩️ 되돌리기</li>
              <li>🗑 처음부터</li>
              <li>👉 다 그렸으면 다음 버튼!</li>
              <li>🟥 그만두면 처음부터 다시 시작!</li>
            </ul>
            <button
              className="modal-button confirm"
              onClick={() => setShowGuide(false)}
            >
              알겠어요!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
