import { useNavigate } from "react-router-dom";
import React from "react";
import Button from "../../components/Button";
import "./Complete.css";
import axios from "axios";

import { useUserContext } from "../../contexts/UserContext";

export default function Complete() {
  const { userData } = useUserContext();
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/test/house/intro");
  };

  const handleSubmit = async () => {
    try {
      console.log("보내는 데이터:", userData);

      // 서버로 정보 전송
      const res = await axios.post(
        "http://localhost:5000/sessions/start",
        userData
      );
      console.log("서버 응답:", res.data);
      alert("정보가 성공적으로 저장되었습니다!");

      // 다음 페이지로 이동 (예: 집 그리기 시작)
      navigate("/test/house/intro");
    } catch (err) {
      console.error("저장 실패:", err);
      alert("저장에 실패했어요 😢 다시 시도해 주세요.");
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
      <Button className="button-finish" onClick={handleSubmit}>
        검사 시작하기
      </Button>
    </div>
  );
}
