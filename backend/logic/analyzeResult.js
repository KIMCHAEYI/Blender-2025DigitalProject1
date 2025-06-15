const fs = require("fs");
const path = require("path");
// 상대 위치 해석 함수
function getReferenceLabelByType(type) {
  if (type === "house") return "집벽";
  if (type === "tree") return "나무";
  if (type === "personF" || type === "personM") return "사람";
  return null;
}

function getRelativeMeanings(objects, type) {
  const referenceLabel = getReferenceLabelByType(type);
  const reference = objects.find((o) => o.label === referenceLabel);
  if (!reference) return []; // 기준이 없으면 생략

  const refArea = reference.w * reference.h;
  const results = [];

  objects.forEach((obj) => {
    if (obj.label === referenceLabel) return;

    const objArea = obj.w * obj.h;
    const ratio = objArea / refArea;

    if (ratio < 0.3) {
      results.push({
        label: obj.label,
        meaning: `${obj.label}이 기준 객체(${referenceLabel})보다 작습니다. 위축되거나 보조적 요소일 수 있습니다.`
      });
    } else if (ratio > 0.7) {
      results.push({
        label: obj.label,
        meaning: `${obj.label}이 기준 객체(${referenceLabel})보다 큽니다. 강조되었거나 심리적으로 중요한 요소일 수 있습니다.`
      });
    }
  });

  return results;
}


// YOLO bounding box 결과 절대 해석 (위치 + 면적 기준)
function analyzeYOLOResult(bboxes) {
  const imageWidth = 1280;
  const imageHeight = 1280;
  const imageSize = imageWidth * imageHeight;

  return bboxes.map((obj) => {
    const area = obj.w * obj.h;
    const areaRatio = area / imageSize;

    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;

    // 9분할 절대 위치 측정
    const xZone = cx < imageWidth * 0.33 ? "left" :
                  cx > imageWidth * 0.66 ? "right" : "center";
    const yZone = cy < imageHeight * 0.33 ? "top" :
                  cy > imageHeight * 0.66 ? "bottom" : "middle";

    const position = `${yZone}-${xZone}`; // ex: top-left

    return {
      label: obj.label,
      areaRatio: parseFloat(areaRatio.toFixed(4)),
      position,
      w: obj.w,
      h: obj.h,
      cx,
      cy
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

  const absoluteMeanings = detectedObjects.map((obj) => {
    const { label, areaRatio, position } = obj;

    const match = rules.find(
      (r) =>
        r.label === label &&
        (r.position === "any" || r.position === position) &&
        areaRatio >= r.area_min &&
        areaRatio <= r.area_max
    );

    // ✅ 콘솔에 position, areaRatio, area_min, area_max 출력
    console.log(`\n🧩 [${label}] 감지됨`);
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
      meaning: match ? match.meaning : "해석 기준 없음",
    };
  });

  const relativeMeanings = getRelativeMeanings(detectedObjects, drawingType);

  if (relativeMeanings.length > 0) {
    console.log(`\n📏 상대 크기 해석 (${drawingType}) 기준:`);
    relativeMeanings.forEach((m) => {
      console.log(`  [${m.label}] → ${m.meaning}`);
    });
  } else {
    console.log(`\n📏 상대 크기 해석 없음 (기준 객체가 없거나 비교 불가)`);
  }

  return [...absoluteMeanings, ...relativeMeanings];
}

module.exports = {
  analyzeYOLOResult,
  interpretYOLOResult,
};
