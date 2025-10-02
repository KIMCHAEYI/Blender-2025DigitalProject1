const express = require("express");
const path = require("path");
const fs = require("fs");
const { analyzeColors } = require("../logic/colorAnalyzer");

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
    const result = await analyzeColors(imagePath);

    // DB 반영
    const db = readDB();
    const session = db.find((s) => s.id === session_id);
    if (session) {
      const drawing = session.drawings.find((d) => d.id === drawing_id);
      if (drawing) {
        drawing.result = {
          ...drawing.result,
          colorAnalysis: result // ✅ 별도 필드에 저장
        };
        drawing.updatedAt = new Date().toISOString();
        writeDB(db);
      }
    }

    res.json(result);
  } catch (err) {
    console.error("❌ 색상 분석 실패:", err.message);
    res
      .status(500)
      .json({ error: "색상 분석 실패", detail: err.message });
  }
});

module.exports = router;
