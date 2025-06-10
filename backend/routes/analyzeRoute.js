// backend/routes/analyzeRoute.js

const express = require("express");
const router = express.Router();
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { analyzeDrawing } = require("../logic/analyzeResult");

router.get("/analyze", async (req, res) => {
  const fileName = req.query.file;
  const type = req.query.type;
  const checked = req.query.checked; // 감정항목 (선택)

  if (!fileName || !type) {
    return res.status(400).json({ error: "file과 type 쿼리값이 필요합니다" });
  }

  const imagePath = `uploads/${fileName}`;

  try {
    const yoloResults = await runYOLOAnalysis(imagePath, type);

    const detectedObjects = yoloResults.map((obj) => obj.label);

    const result = analyzeDrawing({
      type,
      checkedItems: checked ? JSON.parse(checked) : [],
      detectedObjects,
    });

    res.json({
      objects: yoloResults, // YOLO raw 결과
      analysis: result, // 해석 결과
    });
  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).send("분석 실패: " + err);
  }
});

router.post("/:type", async (req, res) => {
  const { type } = req.params;
  const { image_path } = req.body;

  if (!image_path || !["tree", "house", "personF", "personM"].includes(type)) {
    return res.status(400).json({ error: "image_path와 type이 필요합니다" });
  }

  try {
    const yoloResults = await runYOLOAnalysis(image_path, type);
    const detectedObjects = yoloResults.map((obj) => obj.label);

    const result = analyzeDrawing({
      type,
      checkedItems: [],
      detectedObjects,
    });

    res.json({
      objects: yoloResults,
      analysis: result,
    });
  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).json({ error: "YOLO 분석 실패", detail: err.message });
  }
});

module.exports = router;
