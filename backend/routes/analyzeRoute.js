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

  const imagePath = path.join(__dirname, "../uploads", fileName);

  try {
    // YOLO 실행
    const typeForYolo =
      rawType === "person_male" || rawType === "person_female"
        ? "person"
        : rawType;
    const yoloResult = await runYOLOAnalysis(imagePath, typeForYolo);

    // 분석 결과 해석
    const analysis = interpretYOLOResult(yoloResult, typeForYolo);

    // 🧩 2단계 판단 로직 통합
    // 누락된 객체나 불완전 요소가 있으면 2단계 필요로 판단
    const missingObjects = analysis.missingObjects || [];
    const lowConfidence = analysis.lowConfidence || [];
    const needStep2 = missingObjects.length > 0 || lowConfidence.length > 0;

    const step2Targets = needStep2 ? [typeForYolo] : [];

    // 응답 확장
    res.json({
      objects: yoloResult.objects,
      analysis,
      subtype: rawType,
      need_step2: needStep2,
      targets: step2Targets,
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

// ✅ 분석 완료 상태 확인용 API
router.get("/status", async (req, res) => {
  const { session_id, type } = req.query;
  if (!session_id || !type)
    return res.status(400).json({ error: "session_id, type 필수" });

  try {
    // 분석 결과 파일 혹은 DB 상태 확인 로직 (예시)
    const resultPath = path.join(
      __dirname,
      "../results",
      `${session_id}_${type}.json`
    );

    if (fs.existsSync(resultPath)) {
      const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
      return res.json({
        status: "ready",
        need_step2: result.need_step2 ?? false,
        targets: result.targets ?? [],
      });
    } else {
      return res.json({ status: "pending" });
    }
  } catch (err) {
    console.error("분석 상태 확인 실패:", err);
    res.status(500).json({ error: "status check failed" });
  }
});


module.exports = router;
