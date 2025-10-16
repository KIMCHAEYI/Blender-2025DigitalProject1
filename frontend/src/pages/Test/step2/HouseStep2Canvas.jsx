// src/pages/Test/step2/HouseStep2Canvas.jsx
import React, { useState, useEffect } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate2.jsx";
import { useUserContext } from "../../../contexts/UserContext.jsx";

export default function HouseStep2Canvas() {
  const { userData } = useUserContext();
  const drawingType = "house"; //  명시적으로 정의 (중요)
  const [backendQuestion, setBackendQuestion] = useState("");
  const [previousDrawing, setPreviousDrawing] = useState("");
  const [loading, setLoading] = useState(true);

  //  Step2 대상 목록 불러오기
  const step2Targets = JSON.parse(
    sessionStorage.getItem("step2_targets") || "[]"
  );
  const currentIndex = step2Targets.indexOf(drawingType);
  const nextTarget = step2Targets[currentIndex + 1];
  const nextRoute = nextTarget ? `/test/step2/${nextTarget}` : "/result"; // 다음 페이지 자동 결정

  //  세션 ID 가져오기
  const sessionId =
    userData?.session_id ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("user_id");

  useEffect(() => {
    if (!sessionId) {
      console.warn("세션 ID가 없습니다. Step2 페이지 접근 불가.");
      return;
    }

    const fetchData = async () => {
      try {
        // ① Step2 질문 불러오기
        const questionRes = await fetch(
          `http://172.20.6.207:5000/api/step2/question?session_id=${sessionId}&type=${drawingType}`
        );
        if (!questionRes.ok) throw new Error("질문 요청 실패");
        const questionData = await questionRes.json();
        setBackendQuestion(questionData?.extraQuestion || "");

        // ② 이전 그림(1단계 결과) 불러오기
        const drawingRes = await fetch(
          `http://172.20.6.207:5000/api/drawings/${sessionId}/${drawingType}`
        );
        if (!drawingRes.ok) throw new Error("이전 그림 요청 실패");
        const drawingData = await drawingRes.json();
        setPreviousDrawing(
          drawingData?.image || drawingData?.path || drawingData?.url || ""
        );
      } catch (err) {
        console.error("Step2 데이터 불러오기 실패:", err);
        setBackendQuestion("질문을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, drawingType]);

  //  예외 처리 (세션 없음 or 로딩 중)
  if (!sessionId) {
    return (
      <p style={{ textAlign: "center", marginTop: "40vh" }}>
        잘못된 접근입니다. 세션이 없습니다.
      </p>
    );
  }

  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: "40vh" }}>
        데이터를 불러오는 중입니다...
      </p>
    );
  }

  return (
    <CanvasTemplate
      drawingType={drawingType}
      nextRoute={nextRoute}
      backendQuestion={backendQuestion}
      previousDrawing={previousDrawing}
      paletteEnabled={true}
    />
  );
}
