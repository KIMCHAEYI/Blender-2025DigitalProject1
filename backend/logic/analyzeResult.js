// backend/logic/analyzeResult.js
const fs = require("fs");
const path = require("path");
const processedSessions = new Set();

const RULES_FILE = path.join(__dirname, "../rules/object-evaluation-rules.json");
const STEP2_FILE = path.join(__dirname, "../rules/step2-questions.json");

// 중복 세션 처리 방지용
function logOnce(session_id, message) {
  if (processedSessions.has(session_id)) return;
  processedSessions.add(session_id);
  console.log(message);
}

// 규칙/질문 로드
function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
let ruleData = loadJSON(RULES_FILE);
let step2Questions = loadJSON(STEP2_FILE);

// 핫리로드(선택): 운영 중 파일이 바뀌면 반영하고 싶을 때 주석 해제
// fs.watch(RULES_FILE, () => { try { ruleData = loadJSON(RULES_FILE); } catch {} });
// fs.watch(STEP2_FILE, () => { try { step2Questions = loadJSON(STEP2_FILE); } catch {} });

// 위치 비교: 정확 일치 또는 any 허용
function positionMatch(rulePos, objPos) {
  return rulePos === "any" || rulePos === objPos;
}
// 면적 비교(버퍼)
function areaMatch(areaRatio, min, max) {
  const buffer = 0.005;
  return areaRatio >= (min ?? 0) - buffer && areaRatio <= (max ?? 1) + buffer;
}

// YOLO bbox → 위치/면적 특징
function analyzeYOLOResult(bboxes) {
  const imageWidth = 1280;
  const imageHeight = 1280;
  const imageSize = imageWidth * imageHeight;

  return bboxes.map((obj) => {
    const area = obj.w * obj.h;
    const areaRatio = area / imageSize;

    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;

    const xZone = cx < imageWidth * 0.33 ? "left" : cx > imageWidth * 0.66 ? "right" : "center";
    const yZone = cy < imageHeight * 0.33 ? "top" : cy > imageHeight * 0.66 ? "bottom" : "middle";
    const position = `${yZone}-${xZone}`;

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

// === 부재(미표현) 규칙 판단 유틸 ===
// when_missing === true 이거나, 기존 JSON처럼 area_min/max가 모두 0.0인 경우를 "미표현 규칙"으로 간주
function isMissingRule(rule) {
  if (rule.when_missing === true) return true;
  const zeroMin = typeof rule.area_min === "number" && rule.area_min === 0.0;
  const zeroMax = typeof rule.area_max === "number" && rule.area_max === 0.0;
  return zeroMin && zeroMax;
}

// === 조건부 질문 트리거 유틸 ===
function pushIfMissing(labelCounts, label, arr, key) {
  const count = labelCounts[label] || 0;
  if (count === 0) arr.push(key); // *_missing
}
function pushIfLow(labelCounts, label, maxAllowed, arr, key) {
  const count = labelCounts[label] || 0;
  if (count <= maxAllowed) arr.push(key); // *_low
}

// 메인: YOLO 결과 해석 + step2 분기/질문
function interpretYOLOResult(yoloResult, drawingType, eraseCount = 0, resetCount = 0, penUsage = null) {
  // 방어
  const objList = Array.isArray(yoloResult?.objects) ? yoloResult.objects : [];
  const rulesForType = ruleData[drawingType] || [];
  const detectedObjects = analyzeYOLOResult(objList);

  // 라벨별 개수
  const labelCounts = {};
  for (const o of detectedObjects) {
    labelCounts[o.label] = (labelCounts[o.label] || 0) + 1;
  }

// 1) 존재 객체 해석(의미)
const objectAnalyses = detectedObjects.map((obj) => {
  const { label, areaRatio, position } = obj;
  const count = labelCounts[label];
  const matched = rulesForType.filter((r) => {
    if (isMissingRule(r)) return false; // 미표현 규칙은 여기선 제외
    const posOk = positionMatch(r.position, position);
    const areaOk = areaMatch(areaRatio, r.area_min, r.area_max);
    const countOk = !r.min_count || count >= r.min_count;
    return r.label === label && posOk && areaOk && countOk;
  });
  const meaning = matched.length
    ? matched.map((r) => `- ${r.meaning}`).join("\n")
    : "해석 기준 없음";
  return { ...obj, meaning };
});

// 2) 미표현(부재) 규칙 해석
const missingAnalyses = [];
const seenMissing = new Set();
for (const r of rulesForType) {
  if (!isMissingRule(r)) continue;
  if (seenMissing.has(r.label)) continue;
  const count = labelCounts[r.label] || 0;
  if (count === 0) {
    missingAnalyses.push({
      label: `${r.label} (미표현)`,
      meaning: r.meaning,
    });
    seenMissing.add(r.label);
  }
}

  // 3) 행동 규칙 (기존)
  const behaviorAnalyses = [];
  // 🔹 지우기 해석
  if (eraseCount === 0) {
    behaviorAnalyses.push({
      label: "지우기 사용",
      meaning: "지우기 한 번의 시도로 그림을 완성한 모습에서 자신감과 안정된 정서를 엿볼 수 있습니다.",
    });
  } else if (eraseCount <= 2) {
    behaviorAnalyses.push({
      label: "지우기 사용",
      meaning: "그림을 수정한 흔적이 적당히 관찰되며, 세밀한 자기조절과 완성도를 추구하는 태도가 보입니다.",
    });
  } else {
    behaviorAnalyses.push({
      label: "지우기 사용",
      meaning: "지우는 횟수가 많아 신중하거나 불안정한 심리 상태가 일부 반영되었을 가능성이 있습니다.",
    });
  }

  // 🔹 리셋 해석
  if (resetCount === 0) {
    behaviorAnalyses.push({
      label: "리셋 사용",
      meaning: "한 번도 새로 그리려 하지 않고 흐름을 유지하며 완성한 점은 계획성과 자기 확신을 보여줍니다.",
    });
  } else if (resetCount <= 2) {
    behaviorAnalyses.push({
      label: "리셋 사용",
      meaning: "처음부터 다시 그린 횟수가 적당하여, 조정과 개선을 통해 완성도를 높이려는 노력이 엿보입니다.",
    });
  } else {
    behaviorAnalyses.push({
      label: "리셋 사용",
      meaning: "여러 번 다시 그린 모습은 불안감이나 완벽주의적 경향을 시사할 수 있습니다.",
    });
  }


  // 3-1) 펜 굵기 해석
  const penAnalyses = [];
  if (penUsage) {
    const entries = Object.entries(penUsage);
    if (entries.length > 0) {
      const [mainThickness] = entries.sort((a, b) => b[1] - a[1])[0];
      let meaning = "";

      if (mainThickness === "thin") {
        meaning = "가는 선을 주로 사용하여 섬세하고 신중한 성향을 보이며, 내면의 세부 표현에 집중하는 경향이 있습니다.";
      } else if (mainThickness === "normal") {
        meaning = "보통 굵기의 선을 주로 사용하여 안정적이고 조화로운 심리 상태를 반영합니다.";
      } else if (mainThickness === "thick") {
        meaning = "굵은 선을 주로 사용하여 자기표현이 강하고 에너지 넘치는 태도를 나타냅니다.";
      }

      penAnalyses.push({ label: "펜 굵기 사용", meaning });
    }
  }


  // 4) step2 분기 + 조건부 질문
  let step = 1;
  let extraQuestion = null;

  if (
  (drawingType === "house" && detectedObjects.length <= 10) ||
  (drawingType === "tree" && detectedObjects.length <= 7) ||
  (
    (drawingType === "person" ||
     drawingType === "person_male" ||
     drawingType === "person_female") &&
    detectedObjects.length <= 8
  )
) {
    step = 2;

    const conditional = step2Questions[drawingType]?.conditional || {};
    const triggers = [];

    // 예시 트리거들 (자유롭게 확장 가능)
    if (drawingType === "house") {
      pushIfMissing(labelCounts, "울타리", triggers, "울타리_missing");
      pushIfMissing(labelCounts, "굴뚝", triggers, "굴뚝_missing");
      pushIfMissing(labelCounts, "창문", triggers, "창문_missing");
      pushIfMissing(labelCounts, "문", triggers, "문_missing");
      pushIfMissing(labelCounts, "길", triggers, "길_missing");
    } else if (drawingType === "tree") {
      pushIfLow(labelCounts, "열매", 1, triggers, "열매_low");
      pushIfMissing(labelCounts, "뿌리", triggers, "뿌리_missing");
      pushIfMissing(labelCounts, "가지", triggers, "가지_missing");
      pushIfMissing(labelCounts, "나뭇잎", triggers, "나뭇잎_missing");
    } else if (drawingType === "person") {
      pushIfMissing(labelCounts, "머리", triggers, "머리_missing");
      pushIfMissing(labelCounts, "눈", triggers, "눈_missing");
      pushIfMissing(labelCounts, "코", triggers, "코_missing");
      pushIfMissing(labelCounts, "입", triggers, "입_missing");
      pushIfMissing(labelCounts, "손", triggers, "손_missing");
      pushIfMissing(labelCounts, "다리", triggers, "다리_missing");
      pushIfMissing(labelCounts, "발", triggers, "발_missing");
    }

    // 조건부 질문 모으기
    let candidates = [];
    for (const key of triggers) {
      if (Array.isArray(conditional[key])) {
        candidates = candidates.concat(conditional[key]);
      }
    }

    // 조건부가 없으면 low_objects에서 랜덤
    if (candidates.length === 0) {
      const fallback = step2Questions[drawingType]?.low_objects || [];
      if (fallback.length > 0) {
        extraQuestion = fallback[Math.floor(Math.random() * fallback.length)];
      }
    } else {
      extraQuestion = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // 중복 제거: label + meaning 기준
  const combinedAnalyses = [
    ...objectAnalyses,
    ...missingAnalyses,
    ...behaviorAnalyses,
    ...penAnalyses,
  ];
  const uniqueAnalyses = [];
  const seen = new Set();

  for (const a of combinedAnalyses) {
    const key = `${a.label}::${a.meaning}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueAnalyses.push(a);
    }
  }

  // ✅ 의미만 남기고 '해석 기준 없음'과 '-' 제거
  const meaningOnlyAnalyses = uniqueAnalyses
    .map(({ meaning }) => {
      if (!meaning || meaning.includes("해석 기준 없음")) return null;
      // 여러 줄 meaning 처리 시, 각 줄 앞의 '-' 제거
      const cleaned = meaning
        .split("\n")
        .map(line => line.replace(/^-+\s*/, "").trim()) // '- ' 제거
        .filter(Boolean)
        .join("\n");
      return cleaned.trim() ? { meaning: cleaned } : null;
    })
    .filter(Boolean);

  return {
    step,
    drawingType,
    analysis: meaningOnlyAnalyses, // ✅ meaning만 전달
    ...(extraQuestion && { extraQuestion }),
  };
}
module.exports = { analyzeYOLOResult, interpretYOLOResult };