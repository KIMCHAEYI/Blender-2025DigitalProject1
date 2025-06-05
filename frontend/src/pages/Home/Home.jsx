// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import React from "react";
import "./Home.css"; // CSS는 따로 분리해서 관리해도 좋아요

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">Logo</div>
        <div className="spacer" />
        <div className="inquiry">문의하기</div>
      </header>

      <div className="main-section">
        <div className="text-section">
          <h1 className="title">HTP 그림 검사 서비스</h1>
          <p className="subtitle">
            AI 기반의 맞춤형 HTP 그림 검사 서비스를 제공합니다.
          </p>
          <p className="description">
            집-나무-사람 검사(House-Tree-Person test), 간단히 HTP 검사(HTP
            test)는 인격의 양상을 측정하기 위해 설계된 투영 검사법이다. 이
            검사는 뇌손상과 일반적인 정신 기능을 분석하기 위해 사용될 수도 있다.
            이 검사는 임상심리학자, 교육자, 고용주들을 위한 진단 도구이다.
            검사를 받는 사람은 집, 나무, 사람 그림을 그려보라는 분명하지 않은
            짧은 지시를 받는다. {" "}
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
    </div>
  );
}
