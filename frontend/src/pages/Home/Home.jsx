import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);
  const stepsRef = useRef(null);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!stepsRef.current || hasShown) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            setHasShown(true);
          }
        });
      },
      { root: null, threshold: 0.15 }
    );
    io.observe(stepsRef.current);
    return () => io.disconnect();
  }, [hasShown]);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo" onClick={() => navigate("/")}></div>
        <div className="spacer" />
        <div className="inquiry" onClick={openModal}>
          <img src="/images/help.png" alt="contact" className="contact" />
        </div>
      </header>

      <div className="main-section">
        <div className="hero-grid">
          <div className="text-section">
            <img
              src="/images/mongle_logo2.png"
              alt="Mongle Logo"
              className="mongle-logo"
            />
            <br />
            <p className="main-subtitle">
              집, 나무, 사람을 그리면 몽글이 당신의 마음 이야기를 전해줘요.
            </p>

            <p className="main-description">
              집, 나무, 사람을 그리면, 몽글이 그림을 살펴보고 궁금한 걸
              물어봐요. 그 대답을 또 다른 그림으로 표현하면, 몽글이 AI로 분석해
              마음 속 이야기를 즐겁고 안전하게 전해줍니다.
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

          <div className="visual-section" aria-hidden></div>
        </div>
      </div>

      {/* Steps Section */}
      <section className="steps" ref={stepsRef}>
        <h2>✔️ How it works</h2>
        <ol className="steps-list">
          <li>
            <span className="step-num">STEP 1</span>
            <h3>그림 그리기</h3>
            <img src="/images/step1.jpg" alt="step1" className="step1" />
            <div className="pill-list">
              <div className="pill">✍️ 그림 시작</div>
              <div className="pill">🏡 집, 나무, 사람</div>
              <div className="pill">🎯 1차 진단</div>
            </div>
            <p>
              몽글이 준비한 주제(집, 나무, 사람 등)에 맞춰 자유롭게 그림을
              그려요.
            </p>
            <br />
            <div className="pill2">🛠 AI 분석</div>
            YOLO 모델이 그림 속 요소(창문, 나무 가지, 표정 등)를 인식하고,
            위치·크기·색·화면 채움 비율·지우개 사용 횟수를 데이터로 변환해
            아동의 1차 심리 상태를 파악해요.
          </li>
          <li>
            <span className="step-num">STEP 2</span>
            <h3>추가로 그림 그리기</h3>
            <img src="/images/step2.jpg" alt="step1" className="step1" />
            <div className="pill-list">
              <div className="pill">🤖 AI 맞춤형 질문 생성</div>
              <div className="pill">🎨 색채 분석</div>
              <div className="pill">🎯 심층 탐색</div>
            </div>
            <p>
              몽글이 1차 분석 결과를 보고, 더 알아보고 싶은 부분을 그림 주제로
              제시해요. 질문에 맞춰 이어 그려주세요. (예: “이 사람 주변에 있는
              장면을 그려주세요.”)
            </p>
            <br />
            <div className="pill2">🛠 AI 분석</div>
            몽글의 데이터 기반 해석 알고리즘이 기존 검사에서는 놓칠 수 있는
            무의식적 표현을 탐지하여, 이를 확인·보완할 수 있는 주제를 자동
            설계합니다. 아이는 말 대신 그림으로 응답하며 자신의 생각을
            자연스럽게 표현해요.
          </li>
          <li>
            <span className="step-num">STEP 3</span>
            <h3>AI 마음 리포트 확인하기</h3>
            <img
              src="/images/iPad Pro 11_ - 2.png"
              alt="step1"
              className="step1"
            />
            <div className="pill-list">
              <div className="pill">📄 리포트 제공</div>
              <div className="pill">🧠 AI 해석</div>
              <div className="pill">🌟 최종 진단</div>
            </div>
            <p>
              몽글이 모든 그림을 종합해 마음 속 이야기를 리포트로 보여줘요.
              <br />
            </p>
            <div className="pill2">🛠 AI 분석</div> 1차와 2차 그림 데이터를
            비교하고, 정량 지표(크기, 비율, 위치 변화)와 정성 분석(그림
            내용·구성)을 함께 적용해 최종 심리 해석을 완성해요. 아동용 요약
            리포트와 전문가용 상세 분석본을 제공합니다.
          </li>
        </ol>
      </section>

      {showModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
          onClick={closeModal}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 id="inquiry-title" className="modal-title">
              문의하기
            </h2>
            <p className="modal-desc">
              궁금한 점이 있으면 아래 방법으로 문의해 주세요.
            </p>

            <div className="modal-buttons">
              <a
                href="https://open.kakao.com/o/smdd9xFh"
                target="_blank"
                rel="noopener noreferrer"
                className="modal-button kakao"
              >
                <span className="btn-emoji">💬</span> 카카오톡으로 문의하기
              </a>
              <a
                href="mailto:blender2025dp@gmail.com"
                className="modal-button email"
              >
                <span className="btn-emoji">📩</span> 이메일로 문의하기
              </a>
            </div>

            <div className="modal-footer">
              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="닫기"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
