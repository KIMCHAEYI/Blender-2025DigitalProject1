import React, { useState, useEffect } from "react";
import CanvasTemplate from "../../../components/CanvasTemplate2.jsx";
import { useUserContext } from "../../../contexts/UserContext.jsx";

export default function PersonStep2Canvas() {
  const { userData } = useUserContext();
  const drawingType = "person"; // ✅ person으로 고정 (남녀 구분은 백엔드 판단)
  const [backendQuestion, setBackendQuestion] = useState("");
  const [previousDrawing, setPreviousDrawing] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ 2단계 대상 목록 가져오기
  const step2Targets = JSON.parse(
    sessionStorage.getItem("step2_targets") || "[]"
  );
  const currentIndex = step2Targets.indexOf(drawingType);
  const nextTarget = step2Targets[currentIndex + 1];
  const nextRoute = nextTarget ? `/test/step2/${nextTarget}` : "/result";

  // ✅ 세션 ID 가져오기
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
        // ① Step2 질문 불러오기 (백엔드가 남/녀 중 선택된 대상 기반으로 질문 반환)
        const qRes = await fetch(
          `http://172.20.14.232:5000/api/step2/question?session_id=${sessionId}&type=${drawingType}`
        );
        if (!qRes.ok) throw new Error("질문 요청 실패");
        const questionData = await qRes.json();
        setBackendQuestion(questionData?.extraQuestion || "");

        // ② 이전 그림(선택된 남/녀 중 하나) 불러오기
        const dRes = await fetch(
          `http://172.20.14.232:5000/api/drawings/${sessionId}/${drawingType}`
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

  // 예외 처리
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

  // CanvasTemplate 렌더링
  return (
    <CanvasTemplate
      drawingType={drawingType}
      nextRoute={nextRoute} // 다음 Step2 또는 결과지로 이동
      backendQuestion={backendQuestion} // 백엔드에서 받은 질문
      previousDrawing={previousDrawing} // 이전 그림 미리보기
      paletteEnabled={true} // Step2 전용 기능 활성화
    />
  );
}
