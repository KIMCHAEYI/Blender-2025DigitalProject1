// src/components/CanvasTemplate2.jsx
import React, { useRef, useState } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../contexts/UserContext.jsx";
import Palette from "../pages/Test/step2/Palette.jsx";
import QuestionModal from "../pages/Test/step2/QuestionModal.jsx";
import { colorPalette } from "../utils/colorPalette.js";
import "./CanvasTemplate2.css";

export default function CanvasTemplate2({
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
  const levels = [2, 4, 8];
  const [penSize, setPenSize] = useState(levels[1]);

  //  색 이름 기반 상태 관리
  const [selectedColor, setSelectedColor] = useState("빨강");
  const [showModal, setShowModal] = useState(paletteEnabled);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  //  2단계 전용 캔버스 크기
  const step2CanvasWidth = 720;
  const step2CanvasHeight = 480;

  // 굵기 조절
  const increasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx < levels.length - 1) setPenSize(levels[idx + 1]);
  };
  const decreasePen = () => {
    const idx = levels.indexOf(penSize);
    if (idx > 0) setPenSize(levels[idx - 1]);
  };

  //  그림 그리기
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

  const handleCancelClick = () => setShowCancelModal(true);
  const handleCancelConfirm = () => navigate("/");
  const handleNextClick = () => setShowSubmitModal(true);
  // 업로드 + 색채 분석
  const handleNext = async () => {
    if (paletteEnabled) {
      try {
        const stage = stageRef.current;
        const dataURL = stage.toDataURL({ pixelRatio: 2 });
        const blob = await (await fetch(dataURL)).blob();
        const file = new File([blob], `${drawingType}_step2.png`, {
          type: "image/png",
        });

        const formData = new FormData();
        formData.append("session_id", userData.session_id);
        formData.append("type", drawingType);
        formData.append("drawing", file);

        const uploadRes = await axios.post(
          "http://172.30.1.71:5000/api/drawings/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const uploadData = uploadRes.data;
        console.log("✅ 2단계 업로드 완료:", uploadData);

        const fileName = uploadData.path.split("/").pop();
        const drawingId = uploadData.drawing_id;

        const colorRes = await fetch(
          "http://172.30.1.71:5000/api/color-analyze",
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

      <div className={`page-center-step2 ${drawingType}-page`}>
        {/* 상단 */}
        <div className="canvas-header-row-step2">
          <div className="rectangle-header-step2">
            {paletteEnabled && backendQuestion ? (
              <h3
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
                className="rectangle-title-step2"
                style={{ textAlign: "center", whiteSpace: "pre-line" }}
              >
                {backendQuestion || ""}
              </h2>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="canvas-body-step2">
          {/* 툴바 */}
          <div className="toolbar">
            <div className="pen-stepper">
              <img
                className="icon-plus"
                src="/images/+.png"
                onClick={increasePen}
                alt="굵기 늘리기"
                width={45}
                height={45}
              />
              <div className="pen-size-display">
                <div
                  className="pen-size-circle"
                  style={{ width: penSize * 2, height: penSize * 2 }}
                />
                <span className="pen-size-label">
                  {penSize === 2 ? "얇게" : penSize === 4 ? "중간" : "굵게"}
                </span>
              </div>
              <img
                className="icon-minus"
                src="/images/-.png"
                onClick={decreasePen}
                alt="굵기 줄이기"
                width={45}
                height={45}
              />
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
              onClick={() => setShowModal(true)}
            />
          </div>

          {/* 캔버스 */}
          <div className="canvas-wrapper-step2">
            <Stage
              ref={stageRef}
              width={step2CanvasWidth}
              height={step2CanvasHeight}
              className="drawing-canvas-step2"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
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
              <div className="preview-box-step2">
                {previousDrawing && (
                  <img src={previousDrawing} alt="이전 그림" />
                )}
              </div>

              <div className="palette-left-step2">
                <Palette
                  selectedColor={selectedColor}
                  onSelectColor={setSelectedColor}
                />
              </div>
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="footer-buttons-step2">
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
                <li>➕/➖ : '펜 굵기'를 조정할 수 있어요!</li>
                <li>↩️ : 한 획 되돌리기</li>
                <li>🗑 : 처음부터 다시 그리기</li>
                <li>🟦 : 다 그렸으면 '다음으로'를 눌러요!</li>
                <li>🟥 : 검사를 그만두고 싶을 때 눌러요!</li>
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
    </>
  );
}
