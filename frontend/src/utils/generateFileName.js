export function generateSafePngFileName(userData, type) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  const cleanName = userData.name?.replace(/[^\w가-힣]/g, "") || "사용자";
  const birthShort = userData.birth?.replaceAll("-", "").slice(2) || "000000";

  const genderMap = {
    여자: "F",
    남자: "M",
  };
  const genderCode = genderMap[userData.gender] || "X";

  const typeMap = {
    house: "H",
    tree: "T",
    personFemale: "PF",
    personMale: "PM",
  };
  const typeCode = typeMap[type] || "X";

  return `${date}_${time}_${cleanName}_${genderCode}_${birthShort}_${typeCode}.png`;
}
