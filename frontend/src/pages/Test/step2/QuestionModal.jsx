// src/pages/Test/step2/QuestionModal.jsx
import React from "react";
import "./QuestionModal.css";

export default function QuestionModal({ isOpen, onClose, question }) {
  if (!isOpen) return null;

  const fallbackQuestion =
    "1단계 그림을 바탕으로, 추가로 그림을 그려볼까요?";

  const handleOverlayClick = (e) => e.stopPropagation();

  // 완벽한 디코딩 함수 (유니코드, HTML 이스케이프 모두 복원)
  const decodeString = (str) => {
    if (!str) return "";
    try {
      // 1) 유니코드 이스케이프 (\u003cbr\u003e → <br>)
      const unicodeDecoded = str.replace(/\\u[\dA-F]{4}/gi, (match) =>
        String.fromCharCode(parseInt(match.replace("\\u", ""), 16))
      );

      // 2) HTML 엔티티 (&lt;br&gt; → <br>)
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
        <p
          className="modal-title"
          dangerouslySetInnerHTML={{ __html: formattedQuestion }}
          style={{ textAlign: "center", lineHeight: "1.6" }}
        />

        <ul className="modal-guide">
          <li>🎨 색깔을 자유롭게 골라 사용할 수 있어요.</li>
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
