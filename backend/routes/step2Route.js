// routes/step2Route.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const QUESTIONS_FILE = path.join(__dirname, "../rules/step2-questions.json");
const DB_FILE = path.join(__dirname, "../models/db.json");

// ✅ Step2 질문 제공
router.get("/question", async (req, res) => {
  try {
    const { session_id, type } = req.query;
    if (!session_id || !type) {
      return res.status(400).json({ error: "session_id와 type이 필요합니다." });
    }

    // DB & 질문 파일 읽기
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf-8"));

    const session = db.find((s) => String(s.id) === String(session_id));
    if (!session) {
      return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
    }

    // type 매칭 (예: person → person_male, person_female 포함)
    const drawings = session.drawings || [];
    const drawing = drawings.find((d) => {
        const dtype = d.type;
        if (!dtype) return false;
        if (type === "person") {
            return ["person", "person_male", "person_female"].includes(dtype);
        }
        return dtype === type; // house면 house만, tree면 tree만
    });

    if (!drawing) {
      return res.status(404).json({ error: "해당 타입의 그림이 없습니다." });
    }

    // ✅ analysis 구조 안전하게 꺼내기
    let analysis = drawing?.result?.analysis;
    if (!Array.isArray(analysis)) {
      if (analysis?.analysis && Array.isArray(analysis.analysis)) {
        analysis = analysis.analysis;
      } else {
        analysis = [];
      }
    }

    // ✅ (미표현) 라벨 기반 누락 키 추출
    const missingKeys = analysis
      .filter((a) => typeof a.label === "string" && a.label.includes("(미표현)"))
      .map((a) => a.label.split(" ")[0] + "_missing");

    // ✅ JSON 파일에서 해당 타입 질문셋 가져오기
    const qset = questions[type] || questions["person"];
    const conditional = qset.conditional || {};
    const low_objects = qset.low_objects || [];

    let selectedQuestion = "";

    // ✅ 1️⃣ 미표현 객체에 해당하는 질문 찾기
    for (const key of missingKeys) {
      if (Array.isArray(conditional[key]) && conditional[key].length > 0) {
        selectedQuestion = conditional[key][0]; // 첫 번째 문장 선택
        break;
      }
    }

    // ✅ 2️⃣ fallback: low_objects 중 하나 사용
    if (!selectedQuestion && Array.isArray(low_objects) && low_objects.length > 0) {
      selectedQuestion = low_objects[Math.floor(Math.random() * low_objects.length)];
    }

    // ✅ 3️⃣ 최종 fallback
    if (!selectedQuestion) {
      selectedQuestion = "이 그림에 대해 조금 더 이야기해 주세요.";
    }

    // 최종 응답
    res.json({ extraQuestion: selectedQuestion });
  } catch (err) {
    console.error("❌ Step2 질문 생성 실패:", err);
    res.status(500).json({ error: "질문 생성 실패" });
  }
});

module.exports = router;