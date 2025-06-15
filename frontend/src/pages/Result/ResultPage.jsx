import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import axios from "axios";
import "./ResultPage.css";

export default function ResultPage() {
  const navigate = useNavigate();
  const { userData } = useUserContext();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleDownloadPDF = async () => {
    const drawingSections = ["house", "tree", "person"];

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 30px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 20px; }
            ul { padding-left: 20px; }
            .meaning-line { margin-left: 10px; font-style: italic; color: #555; }
            img { width: 100%; max-height: 300px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>HTP 검사 결과</h1>
          <p><strong>이름:</strong> ${userData.name}</p>
          <p><strong>성별:</strong> ${userData.gender}</p>
          <p><strong>생년월일:</strong> ${userData.birth}</p>
          <hr />

          ${drawingSections
            .map((type, index) => {
              const analysis = userData.drawings[type]?.analysis || [];
              const image = userData.drawings[type]?.image;

              return `
                <h2>${index + 1}. ${
                type === "house" ? "집" : type === "tree" ? "나무" : "사람"
              } 그림 분석</h2>
                ${
                  image
                    ? `<img src="${image}" alt="${type} 그림" />`
                    : `<p>(그림 이미지 없음)</p>`
                }
                ${
                  analysis.length > 0
                    ? `
                      <ul>
                        ${analysis
                          .map(
                            (obj) => `
                            <li key={idx}>
                            ✅ <b>{obj.label}</b>
                            {obj.meaning && (
                            <div className="meaning-line"> 
                            🧠 <b>의미:</b> {obj.meaning}
                            </div>
                            )}
                            </li>
                          `
                          )
                          .join("")}
                      </ul>
                    `
                    : `<p>아직 분석된 결과가 없습니다.</p>`
                }
              `;
            })
            .join("")}

          <h2>🧠 종합 해석</h2>
          <p>
            피검자는 전반적으로 정서적 안정성과 자기표현 의지를 갖추고 있으며,
            집과 사람 그림에서는 현실 감각과 사회적 적응력이 양호하게 나타납니다.
            반면 나무와 여자 그림에서 감정 몰입과 표현 욕구가 강하게 드러나며,
            이는 내면의 긴장이나 감정적 민감성이 일부 존재함을 시사합니다.
          </p>
        </body>
      </html>
    `;

    try {
      const filename = `HTP_Report_${userData.name}`;
      const res = await axios.post(
        "http://172.16.100.250:5000/api/sessions/generate-pdf",
        {
          html: htmlContent,
          filename,
        }
      );

      const pdfUrl = `http://172.16.100.250:5000${res.data.path}`;
      window.open(pdfUrl, "_blank");
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert("PDF 저장에 실패했어요 😢");
    }
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
                    <li>
                      ✅ <b>${obj.label}</b>$
                      {obj.meaning
                        ? `<div class="meaning-line">🧠 <b>의미:</b> ${obj.meaning}</div>`
                        : ""}
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
        <button className="btn-white" onClick={handleDownloadPDF}>
          PDF로 저장하기
        </button>
      </div>
    </div>
  );
}
