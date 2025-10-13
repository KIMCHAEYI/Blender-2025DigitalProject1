const { synthesizeOverallFromDrawingSummaries } = require("../logic/gptPrompt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult"); 
const { summarizeDrawingForCounselor } = require("../logic/gptPrompt");

const DB_FILE = path.join(__dirname, "../models/db.json");
const router = express.Router();

// ---------------------- 중복 분석 방지 로직 추가 ----------------------
const inProgress = new Set();          // 현재 YOLO 분석 중인 파일들
const yoloCache = new Map();           // 이미 분석된 결과 캐시
// ---------------------------------------------------------------------

router.get("/session/:session_id", async (req, res) => {
  const { session_id } = req.params;
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  const session = db.find((s) => s.id === session_id);
  if (!session) return res.status(404).json({ error: "세션 없음" });

  const results = [];

  for (const drawing of session.drawings) {
    const fileName = drawing.file_name || drawing.filename;
    if (!fileName) continue;

    // ✅ 이미 YOLO+분석 결과가 DB에 저장되어 있으면 그대로 사용
    if (drawing.result && drawing.result.analysis) {
      results.push({
        type:
          drawing.type === "person_male" || drawing.type === "person_female"
            ? "person"
            : drawing.type,
        subtype: drawing.type,
        analysis: drawing.result.analysis,
        path: drawing.path,
        step: drawing.result.analysis.step,
        question: drawing.result.analysis.extraQuestion || null,
      });
      continue;
    }

    // ⚙️ 혹시 result가 없으면 YOLO 재실행 (백업용)
    const imgPath = path.join(__dirname, "../uploads", fileName);
    const yolo = await runYOLOAnalysis(imgPath, drawing.type);
    const analysis = interpretYOLOResult(yolo, drawing.type);

    results.push({
      type:
        drawing.type === "person_male" || drawing.type === "person_female"
          ? "person"
          : drawing.type,
      subtype: drawing.type,
      analysis,
      path: drawing.path,
      step: analysis.step,
      question: analysis.extraQuestion || null,
    });
  }

  res.json({
    session_id,
    results,
    overall_summary: session.overall_summary || null,
    diagnosis_summary: session.diagnosis_summary || null,
  });
});


router.post("/", async (req, res) => {
  try {
    const {
      session_id,
      drawingType,
      yoloResult,
      eraseCount = 0,
      resetCount = 0,
      penUsage = null,
      name,
      gender,
      first_gender,
    } = req.body;

    if (!session_id || !drawingType || !yoloResult) {
      return res
        .status(400)
        .json({ error: "session_id, drawingType, yoloResult가 필요합니다." });
    }

    // YOLO + GPT 해석
    const analysis = interpretYOLOResult(
      yoloResult,
      drawingType,
      eraseCount,
      resetCount,
      penUsage
    );

    const gptSummary = await summarizeDrawingForCounselor(
      { type: drawingType, result: { analysis } },
      { name, gender, first_gender }
    );

    // ✅ DB에 반영
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const session = db.find((s) => s.id === session_id);
    if (session) {
      const target = session.drawings.find((d) => d.type === drawingType);
      if (target) {
        target.result = {
          analysis,
          counselor_summary: gptSummary.summary,
        };
      }

      // ✅ 요기서 전체 그림 다 분석되었으면 자동으로 종합 해석 생성
      if (session.drawings.every(d => d.result && d.result.analysis)) {
        const overall = await synthesizeOverallFromDrawingSummaries(session.drawings, {
          name: session.name,
          gender: session.gender,
          first_gender: session.first_gender,
        });
        session.overall_summary = overall.overall_summary;
        session.diagnosis_summary = overall.diagnosis_summary;
        console.log(`✅ [자동 GPT 종합 완료] ${session_id}`);
      }

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }

    // ✅ 응답 반환
    res.json({
      analysis,
      counselor_summary: gptSummary.summary,
    });
  } catch (err) {
    console.error("POST 분석 실패:", err);
    res.status(500).json({ error: "분석 실패", detail: err.message });
  }
});



// 🧠 전체 종합 해석 (그림 4개 결과 → GPT 종합)
router.post("/overall", async (req, res) => {
  try {
    const { session_id, name, gender, first_gender } = req.body;

    // ✅ session_id로 DB에서 그림 불러오기
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const session = db.find((s) => s.id === session_id);
    if (!session) {
      return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
    }

    const drawings = Object.values(session.drawings || []);
    if (!drawings.length) {
      return res.status(400).json({ error: "그림 데이터가 없습니다." });
    }

    // ✅ GPT 종합 요청
    const overall = await synthesizeOverallFromDrawingSummaries(drawings, {
      name,
      gender,
      first_gender,
    });

    // ✅ 결과 DB에 저장
    session.overall_summary = overall.overall_summary;
    session.diagnosis_summary = overall.diagnosis_summary;

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    console.log("✅ [GPT 종합 결과 저장 완료]", session_id);
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
