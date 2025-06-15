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

    // ✅ 콘솔에 position, areaRatio, area_min, area_max 출력
    console.log(`\n[${label}] 감지됨`);
    console.log(`  - 위치(position): ${position}`);
    console.log(`  - 면적 비율(areaRatio): ${areaRatio}`);
    if (match) {
      console.log(
        `  - 매칭된 룰: area_min=${match.area_min}, area_max=${match.area_max}`
      );
    } else {
      console.log(`  - 매칭되는 해석 룰 없음`);
    }

    return {
      ...obj,
      meaning: match ? match.meaning : "해석 기준이 없습니다.",
    };
  });
}

module.exports = {
  analyzeYOLOResult,
  interpretYOLOResult,
};
