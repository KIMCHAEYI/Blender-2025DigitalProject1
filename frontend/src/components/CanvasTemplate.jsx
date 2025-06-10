// src/components/CanvasTemplate.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "/Users/minju/Blender-2025DigitalProject1/frontend/src/contexts/UserContext.jsx";
import { generateDrawingFileName } from "/Users/minju/Blender-2025DigitalProject1/frontend/src/utils/generateFileName.js";
import { dataURLtoFile } from "/Users/minju/Blender-2025DigitalProject1/frontend/src/utils/dataURLtoFile";

export default function CanvasTemplate({
  drawingType,
  nextRoute,
  title,
  currentStep,
}) {
  const navigate = useNavigate();
  const stageRef = useRef();

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penSize, setPenSize] = useState(2);
  const [canvasWidth, setCanvasWidth] = useState(1123);
  const [history, setHistory] = useState([]);
  const [eraseCount, setEraseCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);

  const totalSteps = 4;

  const isHorizontal = drawingType === "house";
  const BASE_WIDTH = isHorizontal ? 1123 : 794;
  const BASE_HEIGHT = isHorizontal ? 794 : 1123;

  const { userData, setUserData } = useUserContext();
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const handleResize = () => {
      const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
      const screenWidth = window.innerWidth - 40;
      const screenHeight = window.innerHeight - 200;

      const finalWidth =
        screenHeight * aspectRatio <= screenWidth
          ? screenHeight * aspectRatio
          : screenWidth;

      setCanvasWidth(finalWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [BASE_WIDTH, BASE_HEIGHT]);

  const handleNext = async () => {
    if (!stageRef.current || !userData) return;

    requestAnimationFrame(() => {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      console.log("저장된 이미지:", dataURL); // 일단 콘솔에 찍기

      const fileName = generateDrawingFileName({
        name: userData.name,
        birth: userData.birth,
        gender: userData.gender,
        type: drawingType,
      });

      const file = dataURLtoFile(dataURL, fileName);
      const formData = new FormData();
      formData.append("drawing", file);
      formData.append("type", drawingType);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      axios
        .post(
          "http://172.20.24.235:5000/api/sessions/analyze-drawing",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        )
        .then((res) => {
          const { path, filename, analysis } = res.data;

          setUserData((prev) => ({
            ...prev,
            drawings: {
              ...prev.drawings,
              [drawingType]: {
                image: path,
                eraseCount,
                resetCount,
                duration,
                analysis,
              },
            },
          }));

          navigate(nextRoute);
        })
        .catch((err) => {
          console.error("YOLO 분석 실패:", err);
          alert("그림은 저장됐지만 분석에 실패했어요 😢");
          navigate(nextRoute);
        });
    });
  };

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
    setLines([...lines, newLine]);
    setHistory([...history, { action: "start", data: newLine }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || lines.length === 0) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const point = { x: pointer.x / scale, y: pointer.y / scale };
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;
    const updatedLine = {
      ...lastLine,
      points: [...lastLine.points, point.x, point.y],
    };
    setLines([...lines.slice(0, -1), updatedLine]);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleClear = () => {
    setLines([]);
    setIsDrawing(false);
    setHistory([...history, { action: "clear", at: Date.now() }]);
    setResetCount((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (lines.length === 0) return;
    const undone = lines[lines.length - 1];
    setLines(lines.slice(0, -1));
    setHistory([...history, { action: "undo", data: undone, at: Date.now() }]);
    setEraseCount((prev) => prev + 1);
  };

  const scale = canvasWidth / BASE_WIDTH;

  return (
    <div className="page-center house-page">
      <div className="canvas-header-row">
        <div className="rectangle-header">
          <h2 className="rectangle-title">{title}</h2>
        </div>
      </div>

      <div className="canvas-body">
        <div className="toolbar">
          <button className="btn-toolbar" onClick={() => setPenSize(2)}>
            <img src="/assets/pen-mid.svg" alt="얇게" className="icon" /> 얇게
          </button>
          <button className="btn-toolbar" onClick={() => setPenSize(4)}>
            <img src="/assets/pen-mid.svg" alt="중간" className="icon" /> 중간
          </button>
          <button className="btn-toolbar" onClick={() => setPenSize(8)}>
            <img src="/assets/pen-mid.svg" alt="굵게" className="icon" /> 굵게
          </button>
          <button className="btn-toolbar" onClick={handleUndo}>
            <img src="/assets/eraser.svg" alt="지우개" className="icon" />{" "}
            지우개
          </button>
          <button className="btn-toolbar" onClick={handleClear}>
            <img src="/assets/re-draw.svg" alt="새로 그리기" className="icon" />
            새로 <br /> 그리기
          </button>
        </div>

        <div className="canvas-wrapper">
          <div className="progress-indicator static-overlay">
            {[...Array(totalSteps)].map((_, i) => (
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
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
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
                  globalCompositeOperation="source-over"
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      <div className="canvas-footer">
        <button className="btn-base btn-nextblue" onClick={handleNext}>
          다음으로
        </button>
      </div>
    </div>
  );
}
