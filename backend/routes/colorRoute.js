const express = require("express");
const path = require("path");
const { analyzeColors } = require("../logic/colorAnalyzer");

const router = express.Router();

// 2단계 색상 분석 API
router.post("/", async (req, res) => {
  const { file } = req.body; // 업로드된 파일명
  if (!file) {
    return res.status(400).json({ error: "file 값이 필요합니다." });
  }

  const imagePath = path.join(__dirname, "../uploads", file);

  try {
    const result = await analyzeColors(imagePath);
    res.json(result);
  } catch (err) {
    console.error("❌ 색상 분석 실패:", err.message);
    res.status(500).json({ error: "색상 분석 실패", detail: err.message });
  }
});

module.exports = router;
