import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import { useUserContext } from "../../contexts/UserContext";
import PageLayout from "../../components/PageLayout";
import "./NameInput.css";

export default function NameInput() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { setUserData } = useUserContext();
  const canNext = name.trim().length > 0;

  useEffect(() => {
    const handleResize = () => {
      // 키보드 닫힐 때 스크롤 복원
      if (document.activeElement.tagName !== "INPUT") {
        window.scrollTo(0, 0);
        document.body.style.height = `${window.innerHeight}px`;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = () => {
    if (canNext) {
      setUserData((prev) => ({
        ...prev,
        name: name.trim(),
      }));
      navigate("/birth");
    }
  };

  return (
    <PageLayout
      step={1}
      total={5}
      buttonLabel="입력했어요"
      onNext={handleNext}
      nextEnabled={canNext}
    >
      <h2 className="question">
        <span className="highlight">이름</span>을 입력해 주세요
      </h2>
      <InputField
        value={name}
        onChange={setName}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canNext) {
            handleNext();
          }
        }}
      />
    </PageLayout>
  );
}
