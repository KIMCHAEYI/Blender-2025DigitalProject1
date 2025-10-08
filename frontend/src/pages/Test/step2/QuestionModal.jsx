// src/pages/Test/step2/QuestionModal.jsx
import React from "react";
import "./QuestionModal.css";

export default function QuestionModal({ isOpen, onClose, question }) {
  if (!isOpen) return null;

  const fallbackQuestion =
    "1단계 그림을 바탕으로, 추가로 그림을 그려볼까요?";

  // 배경 클릭 막기
  const handleOverlayClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box fade-in" onClick={handleOverlayClick}>
        <p className="modal-title">2단계 그림을 그려볼까요?</p>

          <p className="highlight-text">{question || fallbackQuestion}</p>

        <ul className="modal-guide">
          <li>🎨 색깔은 자유롭게 골라 사용할 수 있어요.</li>
          <li>✏️ 굵기는 원하는 두께로 바꿔 그려보세요.</li>
          <li>↩️ 되돌리기 버튼으로 방금 그린 선을 지울 수 있어요.</li>
          <li>🗑 처음부터 버튼으로 전부 지울 수도 있어요.</li>
        </ul>

        <button className="btn-start" onClick={onClose}>
          시작하기
        </button>
      </div>
    </div>
  );
}
