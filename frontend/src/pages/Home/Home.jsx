// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "./Home.css"; // 스타일은 아래 참고

export default function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleInquiryClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">Logo</div>
        <div className="spacer" />
        <div className="inquiry" onClick={handleInquiryClick}>
          문의하기
        </div>
      </header>

      <div className="main-section">
        <div className="text-section">
          <h1 className="title">HTP 그림 검사 서비스</h1>
          <p className="subtitle">
            AI 기반의 맞춤형 HTP 그림 검사 서비스를 제공합니다.
          </p>
          <p className="description">
            AI 기반의 맞춤형 HTP 그림 검사 서비스는 아동의 심리 상태를
            비대면으로 분석할 수 있도록 개발된 디지털 심리 검사 플랫폼입니다.
            사용자가 컴퓨터나 태블릿으로 집, 나무, 사람을 그리면, AI가 이를
            실시간 분석해 정서 안정성, 자아개념, 가족관계, 사회적 적응 등을
            평가합니다. <p></p> 본 서비스는 언어 표현이 서툰 아동도 감정과
            내면을 자연스럽게 드러낼 수 있도록 설계되었으며, 다양한 환경에서
            겪는 심리적 스트레스를 조기에 파악하고 대응할 수 있도록 돕습니다.
            장소에 구애받지 않고 쉽게 접근할 수 있으며, 반복 검사와 비교 분석이
            가능해 보다 체계적인 심리 지원을 제공합니다.
          </p>

          <div className="button-group">
            <button
              className="btn-base btn-home btn-1"
              onClick={() => navigate("/name")}
            >
              시작하기
            </button>
            <button
              className="btn-base btn-home btn-2"
              onClick={() => navigate("/result/login")}
            >
              지난 검사 결과 보기
            </button>
          </div>
        </div>
      </div>

      {/* 모달 팝업 */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-image-wrapper">
              <img src="/assets/ganadi.png" alt="문의 이미지" />
            </div>
            <div className="modal-footer">
              <button className="modal-close" onClick={closeModal}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
