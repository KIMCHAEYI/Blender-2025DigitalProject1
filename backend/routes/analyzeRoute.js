const express = require("express");
const path = require("path");
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult"); // ✅ 변경

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
    const { drawingType, yoloResult, eraseCount = 0, resetCount = 0 } = req.body;

    if (!drawingType || !yoloResult) {
      return res.status(400).json({ error: "drawingType과 yoloResult가 필요합니다" });
    }

    const analysis = interpretYOLOResult(yoloResult, drawingType, eraseCount, resetCount);
    res.json({ analysis });
  } catch (err) {
    console.error("POST 분석 실패:", err);
    res.status(500).json({ error: "분석 실패", detail: err.message });
  }
});

module.exports = router;
