const fs = require("fs");
const path = require("path");

const RULES_FILE = path.join(__dirname, "../rules/object-evaluation-rules.json");
const rules = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));

const STEP2_FILE = path.join(__dirname, "../rules/step2-questions.json");
const step2Questions = JSON.parse(fs.readFileSync(STEP2_FILE, "utf-8"));


// 위치 비교: 정확 일치 또는 "any" 허용
function positionMatch(rulePos, objPos) {
  return rulePos === "any" || rulePos === objPos;
}

// 면적 비교: 약간의 오차 허용
function areaMatch(areaRatio, min, max) {
  const buffer = 0.005;
  return areaRatio >= min - buffer && areaRatio <= max + buffer;
}

// YOLO bounding box 결과 해석 (위치 + 면적 기준)
function analyzeYOLOResult(bboxes) {
  const imageWidth = 1280;
  const imageHeight = 1280;
  const imageSize = imageWidth * imageHeight;

  return bboxes.map((obj) => {
    const area = obj.w * obj.h;
    const areaRatio = area / imageSize;

    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;

    const xZone =
      cx < imageWidth * 0.33
        ? "left"
        : cx > imageWidth * 0.66
        ? "right"
        : "center";
    const yZone =
      cy < imageHeight * 0.33
        ? "top"
        : cy > imageHeight * 0.66
        ? "bottom"
        : "middle";

    const position = `${yZone}-${xZone}`; // 예: top-left

    return {
      label: obj.label,
      areaRatio: parseFloat(areaRatio.toFixed(4)),
      position,
      w: obj.w,
      h: obj.h,
      cx,
      cy,
    };
  });
}

// YOLO 결과 해석 적용
function interpretYOLOResult(yoloResult, drawingType, eraseCount = 0, resetCount = 0) {
  let ruleData;
  try {
    ruleData = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));
  } catch (err) {
    console.error("❌ JSON 파싱 오류:", err.message);
    return yoloResult.objects.map((obj) => ({
      ...obj,
      meaning: "❌ 룰 파일 파싱 실패로 해석할 수 없습니다.",
    }));
  }

  const rules = ruleData[drawingType] || [];
  const detectedObjects = analyzeYOLOResult(yoloResult.objects);

  // ✅ 객체 해석
  const labelCounts = {};
  for (const obj of detectedObjects) {
    labelCounts[obj.label] = (labelCounts[obj.label] || 0) + 1;
  }

  const objectAnalyses = detectedObjects.map((obj) => {
    const { label, areaRatio, position } = obj;
    const count = labelCounts[label];

    const matchedRules = rules.filter((r) => {
      const posOk = positionMatch(r.position, position);
      const areaOk = areaMatch(areaRatio, r.area_min, r.area_max);
      const countOk = !r.min_count || count >= r.min_count;
      return r.label === label && posOk && areaOk && countOk;
    });

    const allMeanings = matchedRules.map((r) => `- ${r.meaning}`);
    const meaningText =
      allMeanings.length > 0 ? allMeanings.join("\n") : "해석 기준 없음";

    return {
      ...obj,
      meaning: meaningText,
    };
  });

  // ✅ 행동 해석 (behavior rules)
  const behaviorRules = ruleData.behavior || [];
  const behaviorAnalyses = [];

  for (const rule of behaviorRules) {
    const val = rule.field === "erase_count" ? eraseCount : resetCount;
    if (val >= rule.range[0] && val <= rule.range[1]) {
      behaviorAnalyses.push({
        label: rule.field === "erase_count" ? "지우기 사용" : "리셋 사용",
        meaning: rule.meaning,
      });
    }
  }

    // ✅ Step2 분기 조건
  let step = 1;
  let extraQuestion = null;

  // 집 조건
  if (drawingType === "house") {
    if (detectedObjects.length <= 5) {
      step = 2;
      const pool = step2Questions.house.low_objects;
      extraQuestion = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // 나무 조건
  if (drawingType === "tree") {
    if (detectedObjects.length <= 5) {
      step = 2;
      const pool = step2Questions.tree.low_objects;
      extraQuestion = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // 사람 조건 (남/여 하나라도 5 이하이면 두 그림 모두 step2)
  if (drawingType === "person_man" || drawingType === "person_woman") {
    // partnerObjectsCount는 이후 필요 시 함수 인자로 추가 가능
    if (detectedObjects.length <= 5) {
      step = 2;
      const pool = step2Questions[drawingType].low_objects;
      extraQuestion = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // ✅ 최종 반환: 객체 + 행동 + step
  return {
    step,
    drawingType,
    analysis: [...objectAnalyses, ...behaviorAnalyses],
    ...(extraQuestion && { extraQuestion }),
  };
}

module.exports = {
  analyzeYOLOResult,
  interpretYOLOResult,
};