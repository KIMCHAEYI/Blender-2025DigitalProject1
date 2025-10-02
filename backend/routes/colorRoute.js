const express = require("express");
const path = require("path");
const fs = require("fs");
const { analyzeColors } = require("../logic/colorAnalyzer");
const { refineColorAnalysis } = require("../logic/gptPrompt");

const router = express.Router();
const DB_FILE = path.join(__dirname, "../models/db.json");

function readDB() {
  return fs.existsSync(DB_FILE)
    ? JSON.parse(fs.readFileSync(DB_FILE, "utf-8"))
    : [];
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 2단계 색상 분석 API
router.post("/", async (req, res) => {
  const { file, session_id, drawing_id } = req.body;
  if (!file || !session_id || !drawing_id) {
    return res
      .status(400)
      .json({ error: "file, session_id, drawing_id 값이 필요합니다." });
  }

  const imagePath = path.join(__dirname, "../uploads", file);

  try {
    // 1) 색채 분석
    const result = await analyzeColors(imagePath);

    // 2) GPT로 다듬기
    const refined = await refineColorAnalysis(result.analysis);

    // 3) DB 반영
    const db = readDB();
    const session = db.find((s) => s.id === session_id);
    if (session) {
      const drawing = session.drawings.find((d) => d.id === drawing_id);
      if (drawing) {
        drawing.result = {
          ...drawing.result,
          colorAnalysis: {
            ...result,      // step, colors, analysis (원본)
            refined         // GPT 다듬은 버전
          }
        };
        drawing.updatedAt = new Date().toISOString();
        writeDB(db);
      }
    }

    // 4) 응답 (그림별로 색채해석 따로 나감)
    res.json({
      ...result,
      refined
    });
  } catch (err) {
    console.error("❌ 색상 분석 실패:", err.message);
    res
      .status(500)
      .json({ error: "색상 분석 실패", detail: err.message });
  }
});


module.exports = router;
