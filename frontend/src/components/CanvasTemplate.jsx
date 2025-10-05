// src/components/CanvasTemplate.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext.jsx";
import { colorPalette } from "../utils/colorPalette.js";
import Palette from "../pages/Test/step2/Palette.jsx";
import "./CanvasTemplate.css";

export default function CanvasTemplate({
  drawingType,
  nextRoute,
  backendQuestion,
  previousDrawing,
  paletteEnabled = false,
}) {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const { userData } = useUserContext();

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("검정");
  const [penSize, setPenSize] = useState(4);
  const [canvasWidth, setCanvasWidth] = useState(900);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // ✅ 캔버스는 모두 가로형 (A4 landscape)
  const BASE_WIDTH = 1123;
  const BASE_HEIGHT = 794;
  const aspectRatio = BASE_WIDTH / BASE_HEIGHT;

  // ✅ 브라우저 크기에 따라 비율 유지 (가로형 기준)
  useEffect(() => {
    const handleResize = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const maxHeight = screenH * 0.75;
      const widthIfHeightLimited = maxHeight * aspectRatio;
      const maxWidth = screenW * 0.75;

      const finalWidth = Math.min(maxWidth, widthIfHeightLimited);
      const finalHeight = finalWidth / aspectRatio;

      setCanvasWidth(finalWidth);
      setCanvasHeight(finalHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [aspectRatio]);

  // 🎨 마우스 이벤트 (Konva 내부 좌표 기준)
  const handleMouseDown = (e) => {
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    setIsDrawing(true);
    const newLine = {
      points: [pos.x, pos.y],
      stroke: paletteEnabled
        ? `rgb(${colorPalette[selectedColor].join(",")})`
        : "#111",
      strokeWidth: penSize,
      tension: 0.5,
      lineCap: "round",
    };
    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();

    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      const updated = { ...last, points: [...last.points, pos.x, pos.y] };
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => setIsDrawing(false);
  const handleUndo = () => setLines((prev) => prev.slice(0, -1));
  const handleClear = () => setLines([]);
  const handleNext = () => navigate(nextRoute);

  return (
    <div className={`page-center ${drawingType}-page`}>
      {/* ✅ 상단 질문 */}
      <div className="canvas-header-row">
        <div className="rectangle-header">
          {paletteEnabled && backendQuestion ? (
            <p className="step2-question">{backendQuestion}</p>
          ) : (
            <h2 className="rectangle-title">
              {drawingType === "house"
                ? "집을 그려보세요"
                : drawingType === "tree"
                ? "나무를 그려보세요"
                : "사람을 그려보세요"}
            </h2>
          )}
        </div>
      </div>

      <div className="canvas-body">
        {/* ✅ 왼쪽 툴바 */}
        <div className="toolbar">
          <div className="pen-stepper">
            <button onClick={() => setPenSize((p) => Math.min(p + 2, 10))}>
              <img src="/assets/+.png" alt="굵기 증가" width={32} />
            </button>
            <div
              style={{
                width: penSize * 1.5,
                height: penSize * 1.5,
                borderRadius: "50%",
                background: "#111",
              }}
            />
            <button onClick={() => setPenSize((p) => Math.max(p - 2, 2))}>
              <img src="/assets/-.png" alt="굵기 감소" width={32} />
            </button>
          </div>
          <button className="btn-toolbar" onClick={handleUndo}>
            ↩️ 되돌리기
          </button>
          <button className="btn-toolbar" onClick={handleClear}>
            🗑 처음부터
          </button>
        </div>

        {/* ✅ 중앙 캔버스 */}
        <div className="canvas-wrapper">
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            className="drawing-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Layer>
              <Rect width={canvasWidth} height={canvasHeight} fill="white" />
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

        {/* 미리보기 & 팔레트 */}
        {paletteEnabled && (
          <>
            {/* 미리보기 박스 */}
            <div
            className="preview-box"
            style={{
            //각 타입별로 세로 위치(top) 분리
            top:
            drawingType === "house"
            ? "45%" // house는 가로형이라 약간 위쪽
            : "55%", // tree/person은 세로형이라 조금 아래쪽
            left:
            drawingType === "house"
            ? "calc(50% + 550px)"
            : "calc(50% + 550px)",
            transform: "translateY(-180%)",

            // house는 가로형, tree/person은 세로형 미리보기
            width: drawingType === "house" ? "220px" : "180px",
            height: drawingType === "house" ? "150px" : "220px",
  }}
>
  {previousDrawing && (
    <img src={previousDrawing} alt="이전 그림" />
  )}
</div>

            {/* 팔레트 */}
            <div
              className="palette-right"
              style={{
                top: "50%",
                left:
                  drawingType === "house"
                    ? "calc(50% + 550px)"
                    : "calc(50% + 550px)",
                transform: "translateY(-20%)",
              }}
            >
              <Palette
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
            </div>
          </>
        )}
      </div>

      {/* ✅ 하단 버튼 */}
      <div className="footer-buttons-row">
        <button className="btn-base btn-nextred" onClick={() => navigate("/")}>
          검사 종료
        </button>
        <button className="btn-base btn-nextblue" onClick={handleNext}>
          다음으로
        </button>
      </div>
    </div>
  );
}
