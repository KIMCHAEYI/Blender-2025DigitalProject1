import { createContext, useContext, useState } from "react";

// context 생성
const UserContext = createContext();

// context 제공 컴포넌트
export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    name: "",
    birth: "",
    gender: "",
    password: "",
    //character: "",
    drawings: {
      house: {},
      tree: {},
      person_male: {},
      person_female: {},
    },
    overall_summary: "",
  });

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

// context 사용하는 커스텀 훅
export const useUserContext = () => useContext(UserContext);
