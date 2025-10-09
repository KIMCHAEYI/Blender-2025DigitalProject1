// src/pages/Test/step2/TreeStep2Canvas.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import CanvasTemplate from "../../../components/CanvasTemplate2.jsx";
import { useUserContext } from "../../../contexts/UserContext.jsx";

export default function TreeStep2Canvas() {
  const { drawingType } = useParams(); // ex) "tree"
  const { userData } = useUserContext();
  const [backendQuestion, setBackendQuestion] = useState("");
  const [previousDrawing, setPreviousDrawing] = useState("");
  const [loading, setLoading] = useState(true);

  const step2Targets = JSON.parse(
    sessionStorage.getItem("step2_targets") || "[]"
  );
  const currentIndex = step2Targets.indexOf(drawingType);
  const nextTarget = step2Targets[currentIndex + 1];
  const nextRoute = nextTarget ? `/test/step2/${nextTarget}` : "/result";

  const sessionId =
    userData?.session_id ||
    sessionStorage.getItem("session_id") ||
    sessionStorage.getItem("user_id");

  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      try {
        const qRes = await fetch(
          `http://172.20.6.160:5000/api/step2/question?session_id=${sessionId}&type=${drawingType}`
        );
        const qData = await qRes.json();
        setBackendQuestion(qData?.question || "");

        const dRes = await fetch(
          `http://172.20.6.160:5000/api/drawing/${sessionId}/${drawingType}`
        );
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

  if (!sessionId)
    return (
      <p style={{ textAlign: "center", marginTop: "40vh" }}>세션이 없습니다.</p>
    );
  if (loading)
    return (
      <p style={{ textAlign: "center", marginTop: "40vh" }}>불러오는 중...</p>
    );

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
