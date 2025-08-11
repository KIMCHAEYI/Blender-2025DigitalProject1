import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import { useUserContext } from "../../contexts/UserContext";
import "./Complete.css";

export default function Complete() {
  const { userData } = useUserContext();
  const navigate = useNavigate();

  // ▶ 버튼에 주의를 끄는 힌트 애니메이션 on/off
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHint(true), 800); // 페이지 뜨고 0.8s 후 시작
    return () => clearTimeout(t);
  }, []);
  const stopHint = () => setHint(false);

  const handleSubmit = async () => {
    try {
      stopHint(); // 클릭 시 애니메이션 중지
      console.log("보내는 데이터:", userData);
      const sessionRes = await axios.post(
        "http://192.168.0.250:5000/api/sessions/start",
        userData
      );
      console.log("세션 저장 응답:", sessionRes.data);
      alert("정보가 성공적으로 저장되었습니다!");
      navigate("/test/house/intro");
    } catch (err) {
      console.error("요청 실패:", err);
      alert("처리에 실패했어요 😢 다시 시도해 주세요.");
    }
  };

  return (
    <div className="page-center complete-page">
      <h2 className="message">정보 입력이 완료되었습니다! 🎉</h2>
      <p className="description">
        이제 본격적으로 HTP 검사를 시작할 수 있어요.
        <br />
        마음을 편하게 먹고, 차분히 그림을 그려주세요.
      </p>

      <div onMouseEnter={stopHint} onFocus={stopHint}>
        <Button
          className={`button-finish ${hint ? "cta-pulse" : ""}`}
          onClick={handleSubmit}
        >
          검사 시작하기
        </Button>
      </div>
    </div>
  );
}
