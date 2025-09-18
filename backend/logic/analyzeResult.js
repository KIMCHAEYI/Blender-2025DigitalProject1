const fs = require("fs");
const path = require("path");

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
function interpretYOLOResult(yoloResult, drawingType) {
  const rulePath = path.join(
    __dirname,
    "../rules/object-evaluation-rules.json"
  );

  let ruleData;
  try {
    ruleData = JSON.parse(fs.readFileSync(rulePath, "utf-8"));
  } catch (err) {
    console.error("❌ JSON 파싱 오류:", err.message);
    return yoloResult.objects.map((obj) => ({
      ...obj,
      meaning: "❌ 룰 파일 파싱 실패로 해석할 수 없습니다.",
    }));
  }

  const rules = ruleData[drawingType] || [];
  const detectedObjects = analyzeYOLOResult(yoloResult.objects);

  // ✅ label별 개수 집계
  const labelCounts = {};
  for (const obj of detectedObjects) {
    labelCounts[obj.label] = (labelCounts[obj.label] || 0) + 1;
  }

  return detectedObjects.map((obj) => {
    const { label, areaRatio, position } = obj;
    const count = labelCounts[label];

    // 조건을 만족하는 룰 필터링
      const matchedRules = rules.filter((r) => {
      const posOk = positionMatch(r.position, position);
      const areaOk = areaMatch(areaRatio, r.area_min, r.area_max);
      const countOk = !r.min_count || count >= r.min_count;

      if (!(posOk && areaOk && countOk)) {
        console.log(
          `⚠ [${label}] 매칭 실패 - posOk:${posOk}, areaOk:${areaOk}, countOk:${countOk}`,
          `\n   obj.areaRatio=${areaRatio}, rule=[${r.area_min}, ${r.area_max}], obj.position=${position}, rule.position=${r.position}, count=${count}, rule.min_count=${r.min_count || "없음"}`
        );
      }
      return r.label === label && posOk && areaOk && countOk;
    });

    // 우선순위 룰 선택
    const bestMatch =
      matchedRules.find((r) => r.position !== "any" && r.min_count) ||
      matchedRules.find((r) => r.position !== "any") ||
      matchedRules.find((r) => r.min_count) ||
      matchedRules[0];

    // 의미 병합: 모든 매칭된 룰 기반
    const allMeanings = matchedRules.map((r) => `- ${r.meaning}`);
    const meaningText =
      allMeanings.length > 0 ? allMeanings.join("\n") : "해석 기준 없음";

    // 🔎 콘솔 로그
      if (matchedRules.length > 0) {
      console.log(
        `✅ [${label}] areaRatio=${areaRatio}, position=${position}, count=${count} → ${matchedRules.length}개 룰 매칭됨`
      );
    } else {
      console.log(
        `❌ [${label}] areaRatio=${areaRatio}, position=${position}, count=${count} → 매칭된 룰 없음`
      );
    }

    return {
      ...obj,
      meaning: meaningText,
    };
  });
}

module.exports = {
  analyzeYOLOResult,
  interpretYOLOResult,
};