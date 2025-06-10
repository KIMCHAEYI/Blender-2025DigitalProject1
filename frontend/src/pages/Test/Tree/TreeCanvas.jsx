// src/pages/Test/Tree/TreeCanvas.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useNavigate } from "react-router-dom";
import "./TreeCanvas.css";

export default function TreeCanvas() {
  const navigate = useNavigate();
  const stageRef = useRef();

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penSize, setPenSize] = useState(2);
  const [penColor, setPenColor] = useState("#111");
  const [canvasWidth, setCanvasWidth] = useState(1123);
  const [history, setHistory] = useState([]);
  const [eraseCount, setEraseCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const totalSteps = 4; // 총 인디케이터 개수
  const currentStep = 2; // 나무 단계는 인덱스 1번

  const BASE_WIDTH = 794;
  const BASE_HEIGHT = 1123;

  useEffect(() => {
    console.log("지우개 횟수:", eraseCount);
  }, [eraseCount]);

  useEffect(() => {
    const handleResize = () => {
      const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
      const horizontalPadding = 40;
      const verticalPadding = 200;

      const screenWidth = window.innerWidth - horizontalPadding;
      const screenHeight = window.innerHeight - verticalPadding;

      let finalWidth;
      if (screenHeight * aspectRatio <= screenWidth) {
        finalWidth = screenHeight * aspectRatio;
      } else {
        finalWidth = screenWidth;
      }

      setCanvasWidth(finalWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = () => {
    if (!stageRef.current) return;

    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 }); // 고해상도 저장
    console.log("저장된 이미지:", dataURL); // 일단 콘솔에 찍기

    // 예: localStorage에 저장 (임시)
    localStorage.setItem("treeImage", dataURL);

    navigate("/test/person/intro");
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const scale = stage.scaleX();
    const pos = { x: pointer.x / scale, y: pointer.y / scale };

    const newLine = {
      tool: "pen",
      points: [pos.x, pos.y],
      stroke: penColor,
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

    const newLines = [...lines.slice(0, -1), updatedLine];
    setLines(newLines);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setLines([]);
    setIsDrawing(false);
    setHistory([...history, { action: "clear", at: Date.now() }]);

    setResetCount((prev) => prev + 1); // 새로 그리기 횟수 추가
  };

  const handleUndo = () => {
    if (lines.length === 0) return;
    const undone = lines[lines.length - 1];
    setLines(lines.slice(0, -1));
    setHistory([...history, { action: "undo", data: undone, at: Date.now() }]);
    setEraseCount((prev) => prev + 1); // 지우개 사용 횟수 추가
  };

  const scale = canvasWidth / BASE_WIDTH;

  return (
    <CanvasTemplate
      drawingType="tree"
      title="나무"
      nextRoute="/test/person/intro"
      currentStep={2}
    />
  );
}
