// src/pages/Test/step2/QuestionModal.jsx
import React from "react";
import "./QuestionModal.css";

export default function QuestionModal({ isOpen, onClose, question }) {
  if (!isOpen) return null;

  const fallbackQuestion = "1단계 그림을 바탕으로, 추가로 그림을 그려볼까요?";

  const handleOverlayClick = (e) => e.stopPropagation();

  const decodeString = (str) => {
    if (!str) return "";
    try {
      const unicodeDecoded = str.replace(/\\u[\dA-F]{4}/gi, (match) =>
        String.fromCharCode(parseInt(match.replace("\\u", ""), 16))
      );

      const textarea = document.createElement("textarea");
      textarea.innerHTML = unicodeDecoded;
      return textarea.value;
    } catch (err) {
      console.error("decodeString error:", err);
      return str;
    }
  };

  // 실제 변환된 질문
  const formattedQuestion = decodeString(question || fallbackQuestion);

  return (
    <div className="modal-overlay">
      <div className="modal-box fade-in" onClick={handleOverlayClick}>
        <h3
          className="modal-title"
          dangerouslySetInnerHTML={{ __html: formattedQuestion }}
          style={{ textAlign: "center", lineHeight: "1.6" }}
        />

        <ul className="modal-guide">
          <li>🎨 : 색깔을 자유롭게 골라 사용할 수 있어요.</li>
          <li>➕/➖ : '펜 굵기'를 조정할 수 있어요!</li>
          <li>↩️ : 한 획 되돌리기</li>
          <li>🗑 : 처음부터 다시 그리기</li>
          <li>🟦 : 다 그렸으면 '다음으로'를 눌러요!</li>
          <li>🟥 : 검사를 그만두고 싶을 때 눌러요!</li>
        </ul>

        <button className="modal-button confirm" onClick={onClose}>
          알겠어요!
        </button>
      </div>
    </div>
  );
}
