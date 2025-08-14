// src/pages/ResultPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import axios from "axios";
import { waitForAnalysis } from "../../utils/pollDrawing";
import "./ResultPage.css";

const BASE = "http://172.20.10.168:5000";
const TYPES = ["house", "tree", "person"];

export default function ResultPage() {
  const navigate = useNavigate();
  const { userData, setUserData } = useUserContext();

  // 절대 URL로 보정 (BASE + 경로)
  const toAbsUrl = (path, base) =>
    path ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : "";

  // UI 표시용
  const [loadingMap, setLoadingMap] = useState({}); // {house:true/false,...}
  const [errorMap, setErrorMap] = useState({}); // {house:"에러"...}

  // 업로드된 각 그림(drawing_id)마다, 아직 analysis가 없으면 폴링 시작
  useEffect(() => {
    if (!userData?.session_id) return;
    const cleaners = [];

    TYPES.forEach((type) => {
      const sec = userData?.drawings?.[type];
      if (!sec?.drawing_id) return; // 업로드 안 된 타입은 건너뜀
      if (Array.isArray(sec?.analysis) && sec.analysis.length > 0) return; // 이미 결과 있음

      setLoadingMap((m) => ({ ...m, [type]: true }));
      setErrorMap((m) => ({ ...m, [type]: "" }));

      let canceled = false;
      (async () => {
        try {
          const result = await waitForAnalysis(
            userData.session_id,
            sec.drawing_id,
            {
              onTick: () => {},
            }
          );
          if (canceled) return;
          // 결과 state 반영
          setUserData((prev) => ({
            ...prev,
            drawings: {
              ...prev.drawings,
              [type]: {
                ...prev.drawings?.[type],
                analysis: result?.analysis || [],
                yolo: result?.yolo || null, // 필요시 사용
              },
            },
          }));
        } catch (e) {
          if (!canceled) {
            setErrorMap((m) => ({ ...m, [type]: e?.message || "분석 실패" }));
          }
        } finally {
          if (!canceled) {
            setLoadingMap((m) => ({ ...m, [type]: false }));
          }
        }
      })();

      cleaners.push(() => {
        canceled = true;
      });
    });

    return () => cleaners.forEach((fn) => fn());
  }, [userData?.session_id, userData?.drawings, setUserData]);

  const handleGoHome = () => navigate("/");

  const handleDownloadPDF = async () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = `${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

    const cleanName = userData.name.replace(/[^\w가-힣]/g, "");
    const birthShort = userData.birth.replaceAll("-", "").slice(2);
    const genderMap = {
      여자: "F",
      남자: "M",
      female: "F",
      male: "M",
      여: "F",
      남: "M",
    };
    const genderCode = genderMap[userData.gender] || "X";
    const filename = `HTP_${cleanName}_${birthShort}_${genderCode}_${date}${time}`;

    const html = `
      <html>
        <head>
          <style>
            body { padding: 30px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .meaning-line { margin-left: 16px; font-style: italic; color: #555; }
            img { width: 100%; max-height: 300px; margin: 10px 0; }
            .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid #ddd; color:#333; }
          </style>
        </head>
        <body>
          <h1>HTP 검사 결과</h1>
          <p><strong>이름:</strong> ${userData.name}</p>
          <p><strong>성별:</strong> ${userData.gender}</p>
          <p><strong>생년월일:</strong> ${userData.birth}</p>
          <hr />
          ${TYPES.map((type, idx) => {
            const sec = userData.drawings?.[type] || {};
            const image = sec.image
              ? `${BASE}${sec.image.startsWith("/") ? "" : "/"}${sec.image}`
              : "";
            const analysis = sec.analysis || [];
            const unique = [
              ...new Map(analysis.map((o) => [o.label, o.meaning])).entries(),
            ];
            return `
              <h2>${idx + 1}. ${
              type === "house" ? "집" : type === "tree" ? "나무" : "사람"
            } 그림 분석</h2>
              ${
                image
                  ? `<img src="${image}" alt="${type}">`
                  : `<p>(그림 이미지 없음)</p>`
              }
              ${
                unique.length
                  ? `<ul>${unique
                      .map(
                        ([label, meaning]) =>
                          `<li>✅ <b>${label}</b>${
                            meaning
                              ? `<div class="meaning-line"><b>의미:</b> ${meaning}</div>`
                              : ""
                          }</li>`
                      )
                      .join("")}</ul>`
                  : `<p>아직 분석된 결과가 없습니다.</p>`
              }
            `;
          }).join("")}
          <h2>종합 해석</h2>
          <p>…(요약)…</p>
        </body>
      </html>
    `;

    try {
      const res = await axios.post(`${BASE}/api/sessions/generate-pdf`, {
        html,
        filename,
      });
      window.open(`${BASE}${res.data.path}`, "_blank");
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert("PDF 저장에 실패했어요 😢");
    }
  };

  return (
    <div className="result-page page-scroll">
      <h1>종합 결과</h1>
      <hr className="divider" />

      {TYPES.map((type, index) => {
        const sec = userData.drawings?.[type] || {};
        const analysis = sec.analysis || [];
        const unique = [
          ...new Map(analysis.map((o) => [o.label, o.meaning])).entries(),
        ];
        const isLoading = !!loadingMap[type];
        const errText = errorMap[type];

        return (
          <section key={type}>
            <h2>
              {index + 1}.{" "}
              {type === "house" ? "집" : type === "tree" ? "나무" : "사람"} 그림
              분석 {isLoading && <span className="pill">분석 중…</span>}
              {errText && (
                <span
                  className="pill"
                  style={{ borderColor: "#f66", color: "#c00" }}
                >
                  실패
                </span>
              )}
            </h2>

            {(() => {
              const origUrl = toAbsUrl(sec.image, BASE);
              const yoloUrl = toAbsUrl(sec?.yolo?.image, BASE);
              const hasOrig = !!origUrl;
              const hasYolo = !!yoloUrl;

              if (!hasOrig && !hasYolo) {
                return <p>(그림 이미지 없음)</p>;
              }

              return (
                <div
                  className={`image-row ${hasOrig && hasYolo ? "" : "single"}`}
                >
                  {hasOrig && (
                    <figure className="img-figure">
                      <img
                        src={origUrl}
                        alt={`${type} 원본`}
                        className="drawing-img"
                        loading="lazy"
                      />
                      <figcaption className="img-caption">원본</figcaption>
                    </figure>
                  )}

                  {hasYolo && (
                    <figure className="img-figure">
                      <img
                        src={yoloUrl}
                        alt={`${type} 분석(바운딩박스)`}
                        className="drawing-img"
                        loading="lazy"
                      />
                      <figcaption className="img-caption">
                        분석(바운딩박스)
                      </figcaption>
                    </figure>
                  )}
                </div>
              );
            })()}

            {errText && <p style={{ color: "#c00" }}>에러: {errText}</p>}

            {unique.length > 0 ? (
              <div>
                <h4>객체 인식 결과</h4>
                <ul className="object-list">
                  {unique.map(([label, meaning], idx) => (
                    <li key={idx}>
                      ✅ <b>{label}</b>
                      {meaning && <div className="meaning-line">{meaning}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              !isLoading && !errText && <p>아직 분석된 결과가 없습니다.</p>
            )}
          </section>
        );
      })}

      <section>
        <h2>종합 해석</h2>
        <p className="short-result">(원하시는 요약문구)</p>
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
