const { interpretMultipleDrawings } = require("../logic/gptPrompt");

const express = require("express");
const path = require("path");
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult"); 

const router = express.Router();

router.get("/", async (req, res) => {
  const fileName = req.query.file;
  const rawType = req.query.type;
  if (!fileName || !rawType) {
    return res.status(400).json({ error: "file과 type 쿼리값이 필요합니다" });
  }

  const imagePath = path.join(__dirname, "../uploads", fileName); // 절대경로
  try {
    // 남/여 → YOLO용 타입 정규화
    const typeForYolo =
      rawType === "person_male" || rawType === "person_female"
        ? "person"
        : rawType;
    const yoloResult = await runYOLOAnalysis(imagePath, typeForYolo); // { objects: [...] }
    const analysis = interpretYOLOResult(yoloResult, typeForYolo);
    // 응답에 subtype(원래 요청 타입) 보존
    res.json({
      objects: yoloResult.objects,
      analysis,
      subtype: rawType,
    });
  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).json({ error: "YOLO 분석 실패", detail: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      drawingType,
      yoloResult,
      eraseCount = 0,
      resetCount = 0,
      penUsage = null  
    } = req.body;

    if (!drawingType || !yoloResult) {
      return res.status(400).json({ error: "drawingType과 yoloResult가 필요합니다" });
    }

    // penUsage는 JSON 문자열일 수도 있으니 파싱 시도
    let parsedPenUsage = penUsage;
    if (typeof penUsage === "string") {
      try {
        parsedPenUsage = JSON.parse(penUsage);
      } catch {
        parsedPenUsage = null;
      }
    }

    const analysis = interpretYOLOResult(
      yoloResult,
      drawingType,
      eraseCount,
      resetCount,
      parsedPenUsage  // ✅ 여기서 전달
    );

    res.json({ analysis });
  } catch (err) {
    console.error("POST 분석 실패:", err);
    res.status(500).json({ error: "분석 실패", detail: err.message });
  }
});

// 🧠 전체 종합 해석 (그림 4개 결과 → GPT 종합)
router.post("/overall", async (req, res) => {
  try {
    const { drawings, name, gender, first_gender } = req.body;

    if (!Array.isArray(drawings) || drawings.length === 0) {
      return res.status(400).json({ error: "drawings 배열이 필요합니다." });
    }

    // GPT로 전체 종합 생성
    const overall = await interpretMultipleDrawings(drawings, {
      name,
      gender,
      first_gender,
    });

    console.log("✅ [GPT 전체 종합 결과]", overall);
    res.json(overall);
  } catch (err) {
    console.error("[❌ 전체 종합 해석 실패]", err);
    res.status(500).json({ error: "전체 종합 실패", detail: err.message });
  }
});

module.exports = router;
