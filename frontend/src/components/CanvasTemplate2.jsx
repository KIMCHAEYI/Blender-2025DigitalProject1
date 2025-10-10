// 📄 src/components/CanvasTemplate2.jsx
import React, { useRef, useState } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../contexts/UserContext.jsx";
import Palette from "../pages/Test/step2/Palette.jsx";
import QuestionModal from "../pages/Test/step2/QuestionModal.jsx";
import { colorPalette } from "../utils/colorPalette.js";
import "./CanvasTemplate2.css";

export default function CanvasTemplate({
  drawingType,
  nextRoute,
  previousDrawing,
  paletteEnabled = false,
  backendQuestion = "",
}) {
  const { userData } = useUserContext();
  const navigate = useNavigate();
  const stageRef = useRef(null);

  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penSize, setPenSize] = useState(4);

  // 🎨 색 이름 기반 상태 관리
  const [selectedColor, setSelectedColor] = useState("빨강");
  const [showModal, setShowModal] = useState(paletteEnabled);

  // ✅ 2단계 전용 캔버스 크기 (항상 가로형)
  const step2CanvasWidth = 900;
  const step2CanvasHeight = 600;

  // ✏️ 그림 그리기
  const handleMouseDown = () => {
    if (showModal) return;
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

  const handleMouseMove = () => {
    if (!isDrawing || showModal) return;
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

  // ✅ 업로드 + 색채 분석
  const handleNext = async () => {
    if (paletteEnabled) {
      try {
        const stage = stageRef.current;
        const dataURL = stage.toDataURL({ pixelRatio: 2 });
        const blob = await (await fetch(dataURL)).blob();
        const file = new File([blob], `${drawingType}_step2.png`, {
          type: "image/png",
        });

        // 1️⃣ 업로드 요청
        const formData = new FormData();
        formData.append("session_id", userData.session_id);
        formData.append("type", drawingType);
        formData.append("drawing", file);

        const uploadRes = await axios.post(
          "http://172.20.6.160:5000/api/drawings/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const uploadData = uploadRes.data;
        console.log("✅ 2단계 업로드 완료:", uploadData);

        // 2️⃣ 색채 분석 자동 호출
        const fileName = uploadData.path.split("/").pop();
        const drawingId = uploadData.drawing_id;

        const colorRes = await fetch(
          "http://172.20.6.160:5000/api/color-analyze",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: fileName,
              session_id: userData.session_id,
              drawing_id: drawingId,
            }),
          }
        );

        const colorData = await colorRes.json();
        console.log("🎨 색채 분석 결과:", colorData);

        //alert("색채 분석이 완료되었습니다!");
        navigate(nextRoute);
      } catch (e) {
        console.error("❌ 2단계 업로드/분석 오류:", e);
        alert("색채 분석 중 오류가 발생했습니다.");
      }
    } else {
      navigate(nextRoute);
    }
  };

  return (
    <>
      {paletteEnabled && (
        <QuestionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          question={backendQuestion}
        />
      )}

      <div className={`page-center ${drawingType}-page`}>
        {/* 상단 */}
        <div className="canvas-header-row">
          <div className="rectangle-header">
            {paletteEnabled && backendQuestion ? (
              <p
                className="step2-question"
                dangerouslySetInnerHTML={{ __html: backendQuestion }}
                style={{
                  textAlign: "center",
                  lineHeight: "1.6",
                  whiteSpace: "pre-line",
                }}
              />
            ) : (
              <h2
                className="rectangle-title"
                style={{
                  textAlign: "center",
                  whiteSpace: "pre-line",
                }}
              >
                {backendQuestion || ""}
              </h2>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="canvas-body">
          {/* 툴바 */}
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

          {/* 캔버스 */}
          <div className="canvas-wrapper">
            <Stage
              ref={stageRef}
              width={step2CanvasWidth}
              height={step2CanvasHeight}
              className="drawing-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                <Rect
                  width={step2CanvasWidth}
                  height={step2CanvasHeight}
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

          {/* 미리보기 & 팔레트 */}
          {paletteEnabled && (
            <>
              <div
                className="preview-box"
                style={{
                  top: drawingType === "house" ? "48%" : "61%",
                  left: "calc(50% + 500px)",
                  transform: "translateY(-180%)",
                  width: drawingType === "house" ? "220px" : "180px",
                  height: drawingType === "house" ? "150px" : "220px",
                }}
              >
                {previousDrawing && (
                  <img src={previousDrawing} alt="이전 그림" />
                )}
              </div>

              <div
                className="palette-left"
                style={{
                  top: "35%",
                  left: "calc(50% - 550px)",
                  transform: "translateY(-10%)",
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

        {/* 하단 버튼 */}
        <div className="footer-buttons-row">
          <button
            className="btn-base btn-nextred"
            onClick={() => navigate("/")}
          >
            검사 종료
          </button>
          <button className="btn-base btn-nextblue" onClick={handleNext}>
            다음으로
          </button>
        </div>
      </div>
    </>
  );
}
