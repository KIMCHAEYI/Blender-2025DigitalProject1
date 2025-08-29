// src/components/CanvasTemplate.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../contexts/UserContext.jsx";
import { generateSafePngFileName } from "../utils/generateFileName.js";
import { dataURLtoFile } from "../utils/dataURLtoFile";
import "./CanvasTemplate.css";

// ===== API BASE (ENV 없으면 same-origin → Vite 프록시 경유) =====
const resolveApiBase = () => {
  let raw = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return "";
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`; // origin만 사용
  } catch {
    return "";
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
  const [penSize, setPenSize] = useState(4);
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

  // ✅ 세션ID 가져오기(컨텍스트 → 세션스토리지 순서)
  const getSessionId = () =>
    (userData && userData.session_id) ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("user_id");

  // 처음 방문 시 한 번만 안내 모달
  useEffect(() => {
    const seen = localStorage.getItem("seenToolbarGuideV2");
    if (!seen) {
      setShowGuide(true);
      localStorage.setItem("seenToolbarGuideV2", "true");
    }
  }, []);

  // ✅ 캔버스 크기 계산
  useEffect(() => {
    const aspect = BASE_WIDTH / BASE_HEIGHT;

    const measureAndSet = () => {
      const headerH = headerRef.current?.getBoundingClientRect().height || 0;
      const toolbarW = toolbarRef.current?.getBoundingClientRect().width || 0;
      const footerRect = footerRef.current?.getBoundingClientRect();
      const footerW = footerRect?.width || 0;
      const footerH = footerRect?.height || 0;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const H_GUTTER = 24;
      const V_GUTTER = 24;
      const EXTRA_TITLE_GAP = 16;
      const RIGHT_RESERVED = footerW + 24;
      const BOTTOM_RESERVED = footerH + 24;

      const availW = Math.max(
        0,
        screenW - toolbarW - RIGHT_RESERVED - H_GUTTER * 2
      );
      const availH = Math.max(
        0,
        screenH - headerH - BOTTOM_RESERVED - (V_GUTTER * 2 + EXTRA_TITLE_GAP)
      );

      const widthIfHeightLimited = availH * aspect;
      const finalWidth = Math.floor(Math.min(availW, widthIfHeightLimited));
      setCanvasWidth(Math.max(240, finalWidth));
    };

    measureAndSet();
    const ro = new ResizeObserver(measureAndSet);
    ro.observe(document.body);
    if (headerRef.current) ro.observe(headerRef.current);
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    if (footerRef.current) ro.observe(footerRef.current);

    window.addEventListener("resize", measureAndSet);
    window.addEventListener("orientationchange", measureAndSet);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureAndSet);
      window.removeEventListener("orientationchange", measureAndSet);
    };
  }, [BASE_WIDTH, BASE_HEIGHT]);

  // 버튼 핸들러
  const handleCancelClick = () => setShowCancelModal(true);
  const handleCancelConfirm = () => navigate("/");
  const handleNextClick = () => setShowSubmitModal(true);

  // ✅ 업로드 후 바로 다음 화면으로 (upload만; 분석은 ResultPage에서 폴링)
  const handleNext = async () => {
    if (!stageRef.current) return;

    const sid = getSessionId();
    if (!sid) {
      alert("세션이 없습니다. 검사 시작(로그인/정보 입력)부터 해주세요.");
      return;
    }

    try {
      // 캔버스 → 파일
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const fileName = generateSafePngFileName(userData || {}, drawingType);
      const file = dataURLtoFile(dataURL, fileName);

      // 사람(남/여) → 서버는 type=person + subtype
      const isPM = drawingType === "person_male";
      const isPF = drawingType === "person_female";
      const typeForServer = isPM || isPF ? "person" : drawingType;
      const subtypeForServer = isPM ? "male" : isPF ? "female" : "";

      // 저장 키(카드에서 쓰는 키): person → person_male/female 로 강제 분기
      let outKey = drawingType;
      if (drawingType === "person") {
        if (subtypeForServer) outKey = `person_${subtypeForServer}`;
        else if ((userData?.gender || "").includes("남"))
          outKey = "person_male";
        else if ((userData?.gender || "").includes("여"))
          outKey = "person_female";
      }

      // 업로드 폼
      const formData = new FormData();
      formData.append("drawing", file);
      formData.append("type", typeForServer);
      if (subtypeForServer) formData.append("subtype", subtypeForServer);
      formData.append("session_id", sid);

      // ★ 업로드 엔드포인트(분석은 백엔드가 비동기 처리, ResultPage에서 폴링)
      const uploadRes = await axios.post(
        "http://172.20.31.108:5000/api/drawings/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const data = uploadRes?.data || {};
      const imagePath =
        data.path ||
        data.image ||
        data.file_path ||
        data.result?.image ||
        data.result?.path ||
        "";

      const drawingId =
        data.drawing_id ||
        data.id ||
        data.result?.drawing_id ||
        data.result?.id ||
        null;

      // 업로드 성공 → 결과 기다리지 말고 바로 다음 화면으로 이동
      setUserData((prev) => ({
        ...(prev || {}),
        session_id: sid || prev?.session_id,
        drawings: {
          ...(prev?.drawings || {}),
          [outKey]: {
            image: imagePath,
            eraseCount,
            resetCount,
            duration: Math.floor((Date.now() - startTime) / 1000),
            drawing_id: drawingId, // ResultPage 폴링용
          },
        },
      }));

      navigate(nextRoute);
    } catch (err) {
      console.error("업로드 실패:", err?.response?.data || err.message);
      alert("그림 업로드에 실패했습니다.");
    }
  };

  // 그리기 핸들러
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const pos = { x: pointer.x / scale, y: pointer.y / scale };
    const newLine = {
      points: [pos.x, pos.y],
      stroke: "#111",
      strokeWidth: penSize,
      timestamp: Date.now(),
    };
    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const point = { x: pointer.x / scale, y: pointer.y / scale };
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updated = { ...last, points: [...last.points, point.x, point.y] };
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => setIsDrawing(false);
  const handleClear = () => {
    setLines([]);
    setIsDrawing(false);
    setResetCount((p) => p + 1);
  };
  const handleUndo = () => {
    setLines((p) => p.slice(0, -1));
    setEraseCount((c) => c + 1);
  };

  const scale = canvasWidth / BASE_WIDTH;

  return (
    <div className="page-center house-page">
      <div className="canvas-header-row" ref={headerRef}>
        <div className="rectangle-header">
          <h2 className="rectangle-title">{title}</h2>
        </div>
      </div>

      <div className="canvas-body" ref={wrapperRef}>
        {/* 툴바 */}
        <div className="toolbar" ref={toolbarRef} aria-label="그림 도구">
          <button
            type="button"
            className={`btn-toolbar ${penSize === 2 ? "selected" : ""}`}
            onClick={() => setPenSize(2)}
            title="펜 굵기: 얇게"
          >
            ✏️ 얇게
          </button>
          <button
            type="button"
            className={`btn-toolbar ${penSize === 4 ? "selected" : ""}`}
            onClick={() => setPenSize(4)}
            title="펜 굵기: 중간"
          >
            ✏️ ✏️ 중간
          </button>
          <button
            type="button"
            className={`btn-toolbar ${penSize === 8 ? "selected" : ""}`}
            onClick={() => setPenSize(8)}
            title="펜 굵기: 굵게"
          >
            ✏️✏️ ✏️ 굵게
          </button>

          <button
            type="button"
            className="btn-toolbar"
            onClick={handleUndo}
            title="되돌리기"
          >
            ↩️ 되돌리기
          </button>
          <button
            type="button"
            className="btn-toolbar"
            onClick={handleClear}
            title="처음부터"
          >
            🗑 처음부터
          </button>
          <button
            type="button"
            className="btn-toolbar btn-help"
            onClick={() => setShowGuide(true)}
            aria-label="그림 도구 도움말 열기"
            title="도움말"
          >
            ❓ 도움말
          </button>
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
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

      {/* 처음 방문 안내 모달 (한 번만 표시) */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <span role="img" aria-label="sparkles">
                ✨
              </span>{" "}
              그림 도구 사용법
            </h3>
            <ul
              style={{
                textAlign: "left",
                padding: "0 1rem",
                lineHeight: 1.7,
                fontSize: "16px",
                marginTop: 8,
              }}
            >
              <li>
                ✏️ <b>굵기</b>는 <b>얇게 / 중간 / 굵게</b> 중에서 골라요.
              </li>
              <li>
                ↩️ <b>되돌리기</b>: 방금 그린 선을 지워요.
              </li>
              <li>
                🗑 <b>처음부터</b>: 그림을 모두 지워요.
              </li>
              <li>
                👉 다 그렸으면 <b>다음으로</b> 버튼을 눌러요!
              </li>
              <li>
                🟥 <b>검사 그만두기</b>: 지금 멈추면 <b>처음부터 다시 시작</b>
                해요.
              </li>
              <br />
              모르는 게 있으면 어른에게 도움을 요청하세요!
            </ul>
            <button
              className="modal-button confirm"
              onClick={() => setShowGuide(false)}
              style={{ marginTop: 12 }}
            >
              알겠어요!
            </button>
          </div>
        </div>
      )}

      <div className="footer-buttons-row" ref={footerRef}>
        <button className="btn-base btn-nextred" onClick={handleCancelClick}>
          검사 그만두기
        </button>
        <button className="btn-base btn-nextblue" onClick={handleNextClick}>
          다음으로
        </button>
      </div>

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
    </div>
  );
}
