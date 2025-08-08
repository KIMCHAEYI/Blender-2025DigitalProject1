// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "./Home.css";

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
        <div className="logo">logo</div>
        <div className="spacer" />
        <div className="inquiry" onClick={handleInquiryClick}>
          문의하기
        </div>
      </header>

      <div className="main-section">
        <div className="text-section">
          <h1 className="title">
            <img
              src="/images/mongle_logo2.png"
              alt="Mongle Logo"
              className="mongle-logo"
            />
          </h1>
          <h1 className="main-title">몽글과 그림 여행을 떠나요!</h1>
          <p className="main-subtitle">
            집, 나무, 사람을 그리면 <strong>몽글</strong>이
            <br />
            아이의 마음 속 이야기를 찾아드려요.
          </p>
          <p className="main-description">
            재미있게 그리고, 몰랐던 <strong>마음</strong>도 만나보세요.
            <br />
            언제 어디서나 안전하게 감정을 살펴드립니다.
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
            {/* <div className="modal-image-wrapper">
              <img src="/assets/ganadi.png" alt="문의 이미지" />
            </div> */}
            <div className="modal-buttons">
              <a
                href="https://open.kakao.com/o/smdd9xFh"
                target="_blank"
                rel="noopener noreferrer"
                className="modal-button kakao"
              >
                💬 카카오톡으로 문의하기
              </a>
              <a
                href="mailto:blender2025dp@gmail.com"
                className="modal-button email"
              >
                📩 이메일로 문의하기
              </a>
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
