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
  // 원하는 단계 (3단계 고정)
  const levels = [2, 4, 8]; // 얇게(2), 중간(4), 굵게(8)
  const [penSize, setPenSize] = useState(levels[1]); // 기본값: 중간(4)

  // 펜 굵기 기록 (thin | normal | thick)
  const [penUsageHistory, setPenUsageHistory] = useState({
    thin: 0,
    normal: 0,
    thick: 0,
  });

  // penSize와 penThickness 매핑
  const thicknessMap = {
    2: "thin",
    4: "normal",
    8: "thick",
  };

  // 굵기 늘리기
  const increasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx < levels.length - 1) setPenSize(levels[idx + 1]);
  };

  // 굵기 줄이기
  const decreasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx > 0) setPenSize(levels[idx - 1]);
  };
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

  // useEffect(() => {
  //   console.log("현재 펜 사용 내역:", penUsageHistory);
  // }, [penUsageHistory]);

  // 모달 안내
  useEffect(() => {
    const seen = localStorage.getItem("seenToolbarGuideV2");
    if (!seen) {
      setShowGuide(true);
      localStorage.setItem("seenToolbarGuideV2", "true");
    }
  }, []);

  // 캔버스 크기
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

  // 업로드 후 바로 다음 화면으로
  // 업로드 + sessionStorage 저장 + 다음 이동
  const handleNext = async () => {
    if (!stageRef.current) return;

    const sid = getSessionId();
    if (!sid) {
      alert("세션이 없습니다. 검사 시작(로그인/정보 입력)부터 해주세요.");
      return;
    }

    try {
      // ====== 그림 캡처 ======
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const fileName = generateSafePngFileName(userData || {}, drawingType);
      const file = dataURLtoFile(dataURL, fileName);

      const isPM = drawingType === "person_male";
      const isPF = drawingType === "person_female";
      const typeForServer = isPM || isPF ? "person" : drawingType;
      const subtypeForServer = isPM ? "male" : isPF ? "female" : "";
      let outKey = drawingType;
      if (drawingType === "person") {
        if (subtypeForServer) outKey = `person_${subtypeForServer}`;
        else if ((userData?.gender || "").includes("남"))
          outKey = "person_male";
        else if ((userData?.gender || "").includes("여"))
          outKey = "person_female";
      }

      const first_gender = localStorage.getItem("firstGender");
      const formData = new FormData();
      formData.append("drawing", file);
      formData.append("type", typeForServer);
      if (subtypeForServer) formData.append("subtype", subtypeForServer);
      formData.append("session_id", sid);
      formData.append("eraseCount", String(eraseCount));
      formData.append("resetCount", String(resetCount));
      formData.append(
        "duration",
        String(Math.floor((Date.now() - startTime) / 1000))
      );
      formData.append("first_gender", first_gender);
      formData.append("penUsage", JSON.stringify(penUsageHistory));

      // ====== 업로드 요청 ======
      const uploadRes = await axios.post(
        `${API_BASE}/api/drawings/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const data = uploadRes?.data || {};
      console.log("✅ 업로드 응답:", data);

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

      // const uploadedFile = imagePath?.split("/").pop() || file.name || fileName;
      // sessionStorage.setItem("latest_file", uploadedFile);
      // sessionStorage.setItem("latest_type", drawingType);
      // console.log("💾 latest_file 저장됨:", uploadedFile);
      // console.log("💾 latest_type 저장됨:", drawingType);

      await new Promise((r) => setTimeout(r, 300));

      // 사용자 정보 업데이트
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
            drawing_id: drawingId,
          },
        },
      }));

      // ✅ 이동 분기
      // 1️⃣ 1단계 (house/tree/person 계열): nextRoute로 이동
      // 2️⃣ 2단계 (step2_ prefix로 된 라우트): 결과분기(/result/rotate)
      if (nextRoute && nextRoute.includes("step2")) {
        console.log("➡️ 2단계 완료 → 결과분기로 이동");
        navigate("/result/rotate");
      } else if (nextRoute) {
        console.log("➡️ 1단계 완료 → 다음 라우트로 이동:", nextRoute);
        navigate(nextRoute);
      } else {
        console.log("⚠️ nextRoute 없음 → 결과분기로 기본 이동");
        navigate("/result/rotate");
      }
    } catch (err) {
      console.error("업로드 실패:", err?.response?.data || err.message);
      alert("그림 업로드에 실패했습니다.");
    }
  };

  // 그리기 핸들러
  const handleMouseDown = (e) => {
    setIsDrawing(true);

    // 펜 사용 내역 업데이트
    const thickness = thicknessMap[penSize];
    setPenUsageHistory((prev) => ({
      ...prev,
      [thickness]: prev[thickness] + 1,
    }));

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

  // ✅ 되돌리기 버튼
  const handleUndo = () => {
    setLines((p) => p.slice(0, -1));
    setEraseCount((c) => {
      const newVal = c + 1;
      return newVal;
    });
  };

  // ✅ 처음부터 버튼
  const handleClear = () => {
    setLines([]);
    setIsDrawing(false);
    setResetCount((p) => {
      const newVal = p + 1;
      return newVal;
    });
  };

  useEffect(() => {
    if (eraseCount > 0) {
      console.log(`✅ ${drawingType} 되돌리기 총 횟수: ${eraseCount}`);
    }
  }, [eraseCount, drawingType]);

  useEffect(() => {
    if (resetCount > 0) {
      console.log(`✅ ${drawingType} 처음부터 총 횟수: ${resetCount}`);
    }
  }, [resetCount, drawingType]);

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
          {/* 펜 굵기 Stepper */}
          <div className="pen-stepper">
            {/* + 버튼 (항상 위) */}
            <button
              type="button"
              className="btn-toolbar"
              onClick={increasePen}
              title="굵기 늘리기"
            >
              <img
                src="/assets/+.png"
                alt="굵기 늘리기"
                style={{ width: 45, height: 45 }}
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

            {/* - 버튼 (항상 아래) */}
            <button
              type="button"
              className="btn-toolbar"
              onClick={decreasePen}
              title="굵기 줄이기"
            >
              <img
                src="/assets/-.png"
                alt="굵기 줄이기"
                style={{ width: 45, height: 45 }}
              />
            </button>
          </div>

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
            ❓
          </button>
        </div>

        <div className="canvas-wrapper">
          {
            <div className="progress-indicator static-overlay">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i < currentStep ? "active" : ""}`}
                />
              ))}
            </div>
          }

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
