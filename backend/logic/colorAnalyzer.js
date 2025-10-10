const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

const palette = {
  "빨강": [255, 0, 0],
  "분홍": [255, 105, 180],
  "주황": [255, 165, 0],
  "노랑": [255, 255, 0],
  "초록": [0, 255, 0],
  "파랑": [0, 0, 255],
  "보라": [128, 0, 128],
  "갈색": [139, 69, 19],
  "검정": [0, 0, 0],
  "흰색": [255, 255, 255],
};

const COLOR_RULES = path.join(__dirname, "../rules/color-meaning.json");
const colorMeanings = JSON.parse(fs.readFileSync(COLOR_RULES, "utf-8"));

// 🎨 팔레트 중 가장 가까운 색 찾기
function closestColor(r, g, b) {
  let minDist = Infinity;
  let closest = "흰색";
  for (const [name, [pr, pg, pb]] of Object.entries(palette)) {
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = name;
    }
  }
  return closest;
}

// 🎨 색상 분석 함수
async function analyzeColors(imagePath) {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  const counts = {};
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.slice(i, i + 4);
    if (a < 128) continue;

    const colorName = closestColor(r, g, b);
    counts[colorName] = (counts[colorName] || 0) + 1;
    totalPixels++;
  }

  if (totalPixels === 0) {
    return { step: 2, colors: [], analysis: "이미지에서 유효한 색상을 찾을 수 없습니다." };
  }

  // 비율 계산
  let ratios = Object.entries(counts)
    .map(([name, cnt]) => [name, cnt / totalPixels])
    .sort((a, b) => b[1] - a[1]);

  // 흰색 비율이 너무 높으면 제외
  if (ratios.find(([n]) => n === "흰색" && ratios[0][1] > 0.6)) {
    ratios = ratios.filter(([n]) => n !== "흰색");
  }

  // ✅ 분홍이 너무 미세하게 포함돼도 1% 미만이면 제외
  ratios = ratios.filter(([name, ratio]) => !(name === "분홍" && ratio < 0.01));

  // ✅ 감지된 색상 수에 따라 동적 제한 (최대 3개지만 1~2개만 감지되면 그대로)
  const topColors = ratios.slice(0, Math.min(3, ratios.length)).map(([n]) => n);

  // ✅ 해석 문장
  let analysisText = "2단계 그림에서는 ";
  if (topColors.length > 0) {
    const colorList = topColors.join(", ");
    const meanings = topColors.map((c) => colorMeanings[c] || "").join(" ");
    analysisText += `${colorList} 색상이 주로 사용되어, ${meanings.trim()} `;
    analysisText += "성향이 드러납니다.";
  } else {
    analysisText += "뚜렷한 색상 경향을 확인하기 어렵습니다.";
  }

  return { step: 2, colors: topColors, analysis: analysisText };
}

module.exports = { analyzeColors };
