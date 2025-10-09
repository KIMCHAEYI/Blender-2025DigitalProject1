const { interpretMultipleDrawings } = require("../logic/gptPrompt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult"); 

const DB_FILE = path.join(__dirname, "../models/db.json");
const router = express.Router();

router.get("/", async (req, res) => {
  const fileName = req.query.file;
  const rawType = req.query.type;
  if (!fileName || !rawType) {
    return res.status(400).json({ error: "file과 type 쿼리값이 필요합니다" });
  }

  const imagePath = path.join(__dirname, "../uploads", fileName);

  try {
    // YOLO 실행
    const typeForYolo =
      rawType === "person_male" || rawType === "person_female"
        ? "person"
        : rawType;
    const yoloResult = await runYOLOAnalysis(imagePath, typeForYolo);

    // 분석 결과 해석
    const analysis = interpretYOLOResult(yoloResult, typeForYolo);

    // 🧩 2단계 판단 로직 통합 (step 값까지 반영)
    const missingObjects = analysis.missingObjects || [];
    const lowConfidence = analysis.lowConfidence || [];

    // GPT 해석 결과에 step 값이 2라면 강제로 true 처리
    const hasStep2 = analysis.step === 2;
    const needStep2 = hasStep2 || missingObjects.length > 0 || lowConfidence.length > 0;

    // step2 대상 추출
    const step2Targets = needStep2 ? [typeForYolo] : [];

    // 응답 확장
    res.json({
      objects: yoloResult.objects,
      analysis,
      subtype: rawType,
      need_step2: needStep2,
      targets: step2Targets,
      step: analysis.step,
      question: analysis.question || null,  // ✅ 추가
    });

  } catch (err) {
    console.error("분석 실패:", err);
    res.status(500).json({ error: "YOLO 분석 실패", detail: err.message });
  }
});

// 모든 그림 한번에 분석
router.get("/session/:session_id", async (req, res) => {
  const { session_id } = req.params;
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  const session = db.find((s) => s.id === session_id);
  if (!session) return res.status(404).json({ error: "세션 없음" });

  const results = [];

  // 1️⃣ 모든 그림 YOLO + 해석 실행
  for (const drawing of session.drawings) {
    const fileName = drawing.file_name || drawing.filename;
    if (!fileName) continue;

    const imgPath = path.join(__dirname, "../uploads", fileName);
    const yolo = await runYOLOAnalysis(imgPath, drawing.type);
    const analysis = interpretYOLOResult(yolo, drawing.type);

    results.push({
      type:
        drawing.type === "person_male" || drawing.type === "person_female"
          ? "person"
          : drawing.type,
      subtype: drawing.type, // 🔹 성별 보존
      analysis,
      path: drawing.path,
      step: analysis.step,
      question: analysis.question || null,
    });
  }

  // 2️⃣ 사람 그림만 필터
  const persons = results.filter((r) =>
    r.subtype?.startsWith("person")
  );

  // 내부 함수: 둘 다 2단계일 때 선택 규칙
  const pickPerson = (arr) => {
    const [a, b] = arr;
    const countA = a.analysis.analysis.length;
    const countB = b.analysis.analysis.length;

    if (countA < countB) return a;
    if (countB < countA) return b;

    // 객체 수 동일하면 랜덤
    return Math.random() < 0.5 ? a : b;
  };

  // 3️⃣ 사람 2단계 판단 로직
  let step2 = { person: false };
  if (persons.length === 2) {
    const steps = persons.map((p) => p.step);
    if (steps.every((s) => s === 1)) {
      step2 = { person: false };
    } else if (steps.filter((s) => s === 2).length === 1) {
      // 하나만 2단계
      const selected = persons.find((p) => p.step === 2);
      step2 = {
        person: true,
        target: selected.subtype,
        image: selected.path,
      };
    } else if (steps.every((s) => s === 2)) {
      // 둘 다 2 → pickPerson으로 선택
      const selected = pickPerson(persons);
      step2 = {
        person: true,
        target: selected.subtype,
        image: selected.path,
      };
    }
  } else if (persons.length === 1 && persons[0].step === 2) {
    // 한쪽만 존재하고 2단계면
    step2 = {
      person: true,
      target: persons[0].subtype,
      image: persons[0].path,
    };
  }

  // 4️⃣ 최종 응답
  res.json({
    session_id,
    results,
    step2, // ✅ { person: true/false, target, image }
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
    const { drawings, name, gender, first_gender } = req.body;

    if (!Array.isArray(drawings) || drawings.length === 0) {
      return res.status(400).json({ error: "drawings 배열이 필요합니다." });
    }

    // ✅ 추가: 터미널에서 성별 값 확인용 로그
    // console.log("🎯 [성별 확인 - analyzeRoute]");
    // console.log("사용자 성별(gender):", gender);
    // console.log("먼저 그릴 성별(first_gender):", first_gender);
    // console.log("--------------------------------------------");

    // GPT로 전체 종합 생성
    const overall = await interpretMultipleDrawings(drawings, {
      name,
      gender,
      first_gender,
    });

    console.log("✅ [GPT 전체 종합 결과]", overall);
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
