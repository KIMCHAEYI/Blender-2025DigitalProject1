import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import { useUserContext } from "../../contexts/UserContext";
import "./Complete.css";

export default function Complete() {
  const { userData } = useUserContext();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      console.log("보내는 데이터:", userData);

      // 1. 세션 저장 (Express 서버)
      const sessionRes = await axios.post(
        "http://172.16.100.250:5000/api/sessions/start",
        userData
      );
      console.log("세션 저장 응답:", sessionRes.data);

      // 2. 바로 다음 페이지로 이동
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

      <Button className="button-finish" onClick={handleSubmit}>
        검사 시작하기
      </Button>
    </div>
  );
}
