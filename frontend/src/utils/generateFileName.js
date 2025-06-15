export function generateDrawingFileName({ name, birth, gender, type }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  // ✔ 한글 포함 허용, 단 공백/특수문자 제거
  const birthShort = birth.replaceAll("-", "").slice(2);

  const genderMap = {
    여자: "F",
    남자: "M",
  };
  const genderCode = genderMap[gender] || "X";

  const typeMap = {
    house: "H",
    tree: "T",
    personFemale: "PF",
    personMale: "PM",
  };
  const typeCode = typeMap[type] || "X";

  return `${typeCode}_${name}_${birthShort}_${genderCode}_${date}${time}.png`;
}
