const { interpretMultipleDrawings } = require("../logic/gptPrompt");
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

router.get("/", async (req, res) => {
  const fileName = req.query.file;
  const rawType = req.query.type;
  if (!fileName || !rawType) {
    return res.status(400).json({ error: "file과 type 쿼리값이 필요합니다" });
  }

  const imagePath = path.join(__dirname, "../uploads", fileName);

  // ✅ 중복 요청 차단
  if (inProgress.has(imagePath)) {
    console.log(`[SKIP] ${imagePath} 이미 분석 중`);
    return res
      .status(429)
      .json({ message: "현재 분석 중입니다. 잠시 후 다시 시도하세요." });
  }

  // ✅ 캐시 재사용
  if (yoloCache.has(imagePath)) {
    console.log(`[CACHE] ${imagePath} 결과 재사용`);
    return res.json(yoloCache.get(imagePath));
  }

  inProgress.add(imagePath); // 분석 시작
  console.log(`[YOLO] 분석 시작: ${imagePath}`);

  try {
    const typeForYolo =
      rawType === "person_male" || rawType === "person_female"
        ? "person"
        : rawType;

    const yoloResult = await runYOLOAnalysis(imagePath, typeForYolo);
    const analysis = interpretYOLOResult(yoloResult, typeForYolo);

    const missingObjects = analysis.missingObjects || [];
    const lowConfidence = analysis.lowConfidence || [];

    const hasStep2 = analysis.step === 2;
    const needStep2 =
      hasStep2 || missingObjects.length > 0 || lowConfidence.length > 0;
    const step2Targets = needStep2 ? [typeForYolo] : [];

    const responseData = {
      objects: yoloResult.objects,
      analysis,
      subtype: rawType,
      need_step2: needStep2,
      targets: step2Targets,
      step: analysis.step,
      question: analysis.question || null,
      bbox_url: yoloResult.bbox_url || null,
    };

    // ✅ 결과 캐싱
    yoloCache.set(imagePath, responseData);
    res.json(responseData);
  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).json({ error: "YOLO 분석 실패", detail: err.message });
  } finally {
    // ✅ 반드시 해제
    inProgress.delete(imagePath);
    console.log(`[YOLO] 분석 완료: ${imagePath}`);
  }
});

// 모든 그림 한번에 분석
router.get("/session/:session_id", async (req, res) => {
  const { session_id } = req.params;

  // ① 세션 불러오기
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  const session = db.find((s) => s.id === session_id);
  if (!session) return res.status(404).json({ error: "세션 없음" });

  const results = [];

  // ② 모든 그림 순차적으로 YOLO + 해석 실행 (느리지 않게 안정적)
  for (const drawing of session.drawings) {
    const fileName = drawing.file_name || drawing.filename;
    if (!fileName) continue;

    const imgPath = path.join(__dirname, "../uploads", fileName);

    const yolo = await runYOLOAnalysis(imgPath, drawing.type);
    const analysis = interpretYOLOResult(yolo, drawing.type);

    // 상담자 요약 생성 (세션 정보/행동정보 반영)
    const { summary } = await summarizeDrawingForCounselor(
      {
        type: drawing.type,
        result: { analysis: analysis.analysis, subtype: drawing.type },
        erase_count: Number(drawing.erase_count) || 0,
        reset_count: Number(drawing.reset_count) || 0,
        first_gender: session.first_gender || null,
      },
      {
        name: session.name,
        gender: session.gender,
        first_gender: session.first_gender || null,
      }
    );
  }

  // ③ 결과 반환
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
      drawingType,
      yoloResult,
      eraseCount = 0,
      resetCount = 0,
      penUsage = null  
    } = req.body;

    if (!drawingType || !yoloResult) {
      return res.status(400).json({ error: "drawingType과 yoloResult가 필요합니다" });
    }

    // penUsage는 JSON 문자열일 수도 있으니 파싱 시도
    let parsedPenUsage = penUsage;
    if (typeof penUsage === "string") {
      try {
        parsedPenUsage = JSON.parse(penUsage);
      } catch {
        parsedPenUsage = null;
      }
    }

    const analysis = interpretYOLOResult(
      yoloResult,
      drawingType,
      eraseCount,
      resetCount,
      parsedPenUsage  // ✅ 여기서 전달
    );

    res.json({ analysis });
  } catch (err) {
    console.error("POST 분석 실패:", err);
    res.status(500).json({ error: "분석 실패", detail: err.message });
  }
});

// 🧠 전체 종합 해석 (그림 4개 결과 → GPT 종합)
router.post("/overall", async (req, res) => {
  try {
    const { drawings, name, gender, first_gender, session_id } = req.body;

    if (!Array.isArray(drawings) || drawings.length === 0) {
      return res.status(400).json({ error: "drawings 배열이 필요합니다." });
    }

    const overall = await interpretMultipleDrawings(drawings, {
      name,
      gender,
      first_gender,
    });

    // ✅ DB 업데이트
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const session = db.find((s) => s.id === session_id);
    if (session) {
      session.overall_summary = overall.overall_summary;
      session.diagnosis_summary = overall.diagnosis_summary;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }

    console.log("✅ [GPT 전체 종합 결과 저장 완료]");
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
