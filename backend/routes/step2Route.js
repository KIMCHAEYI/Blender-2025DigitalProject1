const express = require("express");
const path = require("path");
const fs = require("fs");
const step2Questions = require("../rules/step2-questions.json");

const router = express.Router();

router.get("/question", async (req, res) => {
  try {
    const { session_id, type } = req.query;
    if (!session_id || !type)
      return res.status(400).json({ error: "session_id, type 필요" });

    const dbPath = path.join(__dirname, "../models/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const session = db.find((s) => s.id === session_id);

    if (!session) return res.status(404).json({ error: "세션을 찾을 수 없습니다." });

    const baseQuestion =
      step2Questions[type] || "이 그림에 대해 더 이야기해 주세요.";
    res.json({ question: baseQuestion });
  } catch (err) {
    console.error("❌ Step2 질문 API 오류:", err);
    res.status(500).json({ error: "질문 생성 실패" });
  }
});

module.exports = router;
