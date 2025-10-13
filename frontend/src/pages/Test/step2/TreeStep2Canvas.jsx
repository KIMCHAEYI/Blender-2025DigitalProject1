import React, { useState, useEffect } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate2.jsx";
import { useUserContext } from "../../../contexts/UserContext.jsx";

export default function TreeStep2Canvas() {
  const { userData } = useUserContext();
  const drawingType = "tree"; // ✅ 타입 명시
  const [backendQuestion, setBackendQuestion] = useState("");
  const [previousDrawing, setPreviousDrawing] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Step2 대상 목록 가져오기
  const step2Targets = JSON.parse(
    sessionStorage.getItem("step2_targets") || "[]"
  );
  const currentIndex = step2Targets.indexOf(drawingType);
  const nextTarget = step2Targets[currentIndex + 1];
  const nextRoute = nextTarget ? `/test/step2/${nextTarget}` : "/result";

  // ✅ 세션 ID
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
        // ① 질문 불러오기
        const qRes = await fetch(
          `http://172.30.1.71:5000/api/step2/question?session_id=${sessionId}&type=${drawingType}`
        );
        if (!qRes.ok) throw new Error("질문 요청 실패");
        const questionData = await qRes.json();
        setBackendQuestion(questionData?.extraQuestion || "");

        // ② 이전 그림 불러오기
        const dRes = await fetch(
          `http://172.30.1.71:5000/api/drawings/${sessionId}/${drawingType}`
        );
        if (!dRes.ok) throw new Error("이전 그림 요청 실패");
        const dData = await dRes.json();
        setPreviousDrawing(dData?.image || dData?.path || dData?.url || "");
      } catch (err) {
        console.error("Step2 데이터 불러오기 실패:", err);
        setBackendQuestion("질문을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, drawingType]);

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
