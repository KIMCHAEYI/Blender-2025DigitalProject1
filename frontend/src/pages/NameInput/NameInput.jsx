import { useState } from "react";
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
