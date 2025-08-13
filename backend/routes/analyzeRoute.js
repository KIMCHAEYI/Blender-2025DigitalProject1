const express = require("express");
const path = require("path");
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult"); // ✅ 변경

const router = express.Router();

router.get("/analyze", async (req, res) => {
  const fileName = req.query.file;
  const type = req.query.type;
  if (!fileName || !type) {
    return res.status(400).json({ error: "file과 type 쿼리값이 필요합니다" });
  }

  const imagePath = path.join(__dirname, "../uploads", fileName); // 절대경로
  try {
    const yoloResult = await runYOLOAnalysis(imagePath, type); // { objects: [...] }
    const analysis = interpretYOLOResult(yoloResult, type); // ✅ 변경
    res.json({ objects: yoloResult.objects, analysis });
  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).json({ error: "YOLO 분석 실패", detail: err.message });
  }
});

module.exports = router;
