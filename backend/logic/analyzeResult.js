const fs = require("fs");
const path = require("path");

// YOLO bounding box 결과 해석 (위치 + 면적 기준)
function analyzeYOLOResult(bboxes) {
  const imageSize = 1280 * 1280;

  return bboxes.map((obj) => {
    const area = obj.w * obj.h;
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;

    const areaRatio = area / imageSize;
    const xZone = cx < 426 ? "left" : cx > 854 ? "right" : "center";
    const yZone = cy < 426 ? "top" : cy > 854 ? "bottom" : "middle";

    return {
      label: obj.label,
      areaRatio: parseFloat(areaRatio.toFixed(4)),
      position: `${xZone}-${yZone}`,
    };
  });
}

// 객체별 해석 평가 (YOLO 결과 → 위치/면적 해석 → 평가 룰 적용)
function interpretYOLOResult(yoloResult, drawingType) {
  const rulePath = path.join(
    __dirname,
    "../rules/object-evaluation-rules.json"
  );
  const ruleData = JSON.parse(fs.readFileSync(rulePath, "utf-8"));
  const rules = ruleData[drawingType] || [];

  // 👇 YOLO bounding box 원시 데이터 → 분석된 객체 데이터로 변환
  const detectedObjects = analyzeYOLOResult(yoloResult.objects);

  return detectedObjects.map((obj) => {
    const { label, areaRatio, position } = obj;

    const match = rules.find(
      (r) =>
        r.label === label &&
        (r.position === "any" || r.position === position) &&
        areaRatio >= r.area_min &&
        areaRatio <= r.area_max
    );

    return {
      ...obj,
      meaning: match ? match.meaning : "해석 기준 없음",
    };
  });
}

module.exports = {
  analyzeYOLOResult,
  interpretYOLOResult,
};
