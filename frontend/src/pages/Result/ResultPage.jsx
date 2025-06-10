// src/pages/ResultPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import "./ResultPage.css";

export default function ResultPage() {
  const navigate = useNavigate();
  const { userData } = useUserContext();

  const handleGoHome = () => {
    navigate("/");
  };

  const drawingSections = ["house", "tree", "person"];

  return (
    <div className="result-page page-scroll">
      <h1>HTP 검사 결과지</h1>
      <hr className="divider" />

      {drawingSections.map((type, index) => {
        const analysis = userData.drawings[type]?.analysis || [];
        return (
          <section key={type}>
            <h2>
              {index + 1}.{" "}
              {type === "house" ? "집" : type === "tree" ? "나무" : "사람"} 그림
              분석
            </h2>
            {analysis.length > 0 ? (
              <div>
                <h4>객체 인식 결과</h4>
                <ul>
                  {analysis.map((obj, idx) => (
                    <li key={idx}>
                      ✅ <b>{obj.label}</b> - x: {obj.x}, y: {obj.y}, w: {obj.w}
                      , h: {obj.h}
                      {obj.meaning && (
                        <div className="meaning-line">
                          🧠 <b>의미:</b> {obj.meaning}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>아직 분석된 결과가 없습니다.</p>
            )}
          </section>
        );
      })}

      <section>
        <h2>🧠 종합 해석</h2>
        <p className="short-result">
          피검자는 전반적으로 정서적 안정성과 자기표현 의지를 갖추고 있으며,
          집과 사람 그림에서는 현실 감각과 사회적 적응력이 양호하게 나타납니다.
          반면 나무와 여자 그림에서 감정 몰입과 표현 욕구가 강하게 드러나며,
          이는 내면의 긴장이나 감정적 민감성이 일부 존재함을 시사합니다.
        </p>
      </section>

      <div className="result-buttons">
        <button className="btn-black" onClick={handleGoHome}>
          검사 마치기
        </button>
        <button className="btn-white" onClick={() => navigate("/result/login")}>
          지난 검사 결과 보기
        </button>
        <button className="btn-white">PDF로 저장하기</button>
      </div>
    </div>
  );
}
