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

// 🎨 2단계 색채 분석 API
router.post("/", async (req, res) => {
  const { file, session_id, drawing_id } = req.body;
  if (!file || !session_id || !drawing_id) {
    return res
      .status(400)
      .json({ error: "file, session_id, drawing_id 값이 필요합니다." });
  }

  const imagePath = path.join(__dirname, "../uploads", file);

  // ✅ 1) 파일 존재 여부 검증 추가
  if (!fs.existsSync(imagePath)) {
    console.error("❌ 색채 분석 실패: 파일이 존재하지 않습니다.", imagePath);
    return res
      .status(404)
      .json({ error: "이미지 파일을 찾을 수 없습니다.", file });
  }

  try {
    // ✅ 2) 색채 분석 실행
    const result = await analyzeColors(imagePath);

    // ✅ 콘솔에 분석 결과 출력 (테스트용)
    console.log("\n🎨 [색채 분석 RAW 결과]");
    console.log("이미지:", file);
    console.log("Top colors:", result.colors);
    console.log("초안 해석:", result.analysis);
    console.log("-------------------------------------");

    // ✅ 3) GPT로 자연스러운 문장으로 다듬기 (예외 방어)
    let refined;
    try {
      refined = await refineColorAnalysis(result.analysis);
    } catch (gptErr) {
      console.warn("⚠️ GPT 색채 요약 실패, 원문 사용:", gptErr.message);
      refined = result.analysis;
    }

    // ✅ 4) DB 반영
    const db = readDB();
    const session = db.find((s) => s.id === session_id);
    if (session) {
      const drawing = session.drawings.find((d) => d.id === drawing_id);
      if (drawing) {
        drawing.result = {
          ...drawing.result,
          colorAnalysis: {
            ...result, // step, colors, analysis
            refined,   // GPT 버전
          },
        };
        drawing.updatedAt = new Date().toISOString();
        writeDB(db);
      }
    }

    // ✅ 5) 로그 + 응답
    console.log("🎨 [색채 분석 완료]", {
      session_id,
      drawing_id,
      colors: result.colors,
      refined: refined.slice(0, 80) + "...",
    });

    res.json({
      ...result,
      refined,
    });
  } catch (err) {
    console.error("❌ 색채 분석 실패:", err.message);
    res.status(500).json({ error: "색상 분석 실패", detail: err.message });
  }
});

module.exports = router;
