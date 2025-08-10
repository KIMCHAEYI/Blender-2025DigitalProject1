import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import "./CharacterSelect.css";
//import { useUserContext } from "../../contexts/UserContext";

export default function CharacterSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  //const { setUserData, userData } = useUserContext();

  const characters = [
    { id: "cha1", name: "뽈록이", img: "/images/rabbit.png" },
    { id: "cha2", name: "동글이", img: "/images/human.png" },
  ];

  const handleNext = () => {
    if (selected) {
      //setUserData((prev) => ({
      //  ...prev,
      //  character: selected,
      // }));

      navigate("/complete");
    }
  };

  return (
    <div className="page-center character-page">
      <h2 className="question">
        <p className="order">5/5</p>
        <span className="highlight">여정을 함께할 캐릭터</span>를 골라주세요
      </h2>

      <div className="character-list">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`character-item ${
              selected === char.id ? "selected" : ""
            }`}
            onClick={() => setSelected(char.id)}
          >
            <img src={char.img} alt={char.name} />
            <p>{char.name}</p>
          </div>
        ))}
      </div>

      <button
        type="primary"
        className="btn-base btn-primary"
        onClick={handleNext}
        disabled={!selected}
      >
        {selected
          ? `${characters.find((c) => c.id === selected).name}와 함께 할래요`
          : "선택해주세요"}
      </button>
    </div>
  );
}
