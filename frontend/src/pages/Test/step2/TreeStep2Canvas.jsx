// src/pages/Test/step2/TreeStep2Canvas.jsx
import React, { useState, useEffect } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate.jsx";
import { useUserContext } from "../../../contexts/UserContext.jsx";

export default function TreeStep2Canvas() {
  const { userData } = useUserContext();
  const [backendQuestion, setBackendQuestion] = useState("");
  const [previousDrawing, setPreviousDrawing] = useState("");
  const [loading, setLoading] = useState(true);

  // 세션 ID 가져오기
  const sessionId =
    userData?.session_id ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("user_id");

  useEffect(() => {
    if (!sessionId) {
      console.warn("세션 ID 없음: Step2 접근 불가");
      return;
    }

    const fetchData = async () => {
      try {
        // ① Step2 질문 불러오기
        const qRes = await fetch(
          `http://172.30.1.87:5000/api/step2/question?session_id=${sessionId}&type=tree`
        );
        if (!qRes.ok) throw new Error("질문 요청 실패");
        const qData = await qRes.json();
        setBackendQuestion(qData?.question || "");

        // ② 이전 그림 불러오기
        const dRes = await fetch(
          `http://172.30.1.87:5000/api/drawing/${sessionId}/tree`
        );
        if (!dRes.ok) throw new Error("이전 그림 요청 실패");
        const dData = await dRes.json();
        setPreviousDrawing(
          dData?.image || dData?.path || dData?.url || ""
        );
      } catch (err) {
        console.error("Step2 데이터 불러오기 실패:", err);
        setBackendQuestion("질문을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // 예외 처리 (세션 없음 or 로딩 중)
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
      drawingType="tree"
      nextRoute="/test/step2/person"
      backendQuestion={backendQuestion}
      previousDrawing={previousDrawing}
      paletteEnabled={true} //  Step2 기능 활성화
    />
  );
}
