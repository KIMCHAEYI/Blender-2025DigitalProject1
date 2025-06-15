// src/utils/generateFileName.js

export function generateDrawingFileName({ name, birth, gender, type }) {
  const cleanName = name.replace(/\s/g, "");
  return `${type}_${cleanName}_${birth}_${gender}.png`;
}
