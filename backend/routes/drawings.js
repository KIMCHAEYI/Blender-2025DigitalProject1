// backend/routes/drawings.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { runYOLOAnalysis } = require("../logic/yoloRunner"); // YOLO FastAPI 호출 (필드명 image)
const { interpretYOLOResult } = require("../logic/analyzeResult"); // 룰 해석: 위치/면적→meaning 생성
const {
  summarizeDrawingForCounselor,
  synthesizeOverallFromDrawingSummaries,
} = require("../logic/gptPrompt");

// ─────────────────────────────────────────────────────────────────────────────
// DB 유틸
// ─────────────────────────────────────────────────────────────────────────────
const DB_FILE = path.join(__dirname, "../models/db.json");

function readDB() {
  try {
    return fs.existsSync(DB_FILE)
      ? JSON.parse(fs.readFileSync(DB_FILE, "utf-8"))
      : [];
  } catch (e) {
    console.error("[DRAWINGS] readDB error:", e);
    return [];
  }
}
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[DRAWINGS] writeDB error:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 업로드 저장
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, "../uploads");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || "") || "";
    if (!ext) {
      if (file.mimetype === "image/png") ext = ".png";
      else if (file.mimetype === "image/jpeg") ext = ".jpg";
      else if (file.mimetype === "image/webp") ext = ".webp";
    }
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ─────────────────────────────────────────────────────────────────────────────
// 1) 업로드 + 백그라운드 YOLO 분석
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", upload.single("drawing"), (req, res) => {
  //const { session_id, type, eraseCount, resetCount, duration } = req.body;
  //✅ first_gender 추가로 받아옴
  const { session_id, type, eraseCount, resetCount, duration, first_gender } = req.body;

  if (!session_id || !type || !req.file) {
    return res.status(400).json({ message: "session_id, type, drawing 필수" });
  }

  // const filename = req.file.filename;
  // const relPath = "/uploads/" + filename;
  // const absPath = req.file.path;
  // const now = new Date().toISOString();

  const filename = req.file.filename;
  const relPath = "/uploads/" + filename;
  const absPath = req.file.path;
  const now = new Date().toISOString();

  // ✅ 업로드 직후 req.body에서 필요한 값 캐시 (백그라운드에서 req.body가 사라지는 문제 해결)
  const cachedFirstGender = first_gender || null;
  const cachedPenUsage =
    typeof req.body.penUsage === "string"
      ? JSON.parse(req.body.penUsage)
      : req.body.penUsage || null;

  const db = readDB();
  const session = db.find((s) => s.id === session_id);
  if (!session)
    return res.status(404).json({ message: "세션을 찾을 수 없습니다" });
  if (!session.drawings) session.drawings = [];

  const drawingId = Date.now().toString();

  session.drawings.push({
    id: drawingId,
    type,
    filename,
    path: relPath,
    absPath,
    erase_count: Number(eraseCount) || 0,
    reset_count: Number(resetCount) || 0,
    duration: Number(duration) || 0,  
    status: "uploaded",
    result: null,
    createdAt: now,
    updatedAt: now,
});
  writeDB(db);

  res.status(200).json({
    message: "그림 업로드 완료 (분석은 백그라운드)",
    drawing_id: drawingId,
    path: relPath,
  });

// ─────────────────────────────────────────────────────────────────────────────
// 백그라운드 분석 시작
// ─────────────────────────────────────────────────────────────────────────────
  process.nextTick(async () => {
    try {
      // 상태: processing
      const db1 = readDB();
      const s1 = db1.find((s) => s.id === session_id);
      const d1 = s1?.drawings?.find((d) => d.id === drawingId);
      if (!d1) return;
      d1.status = "processing";
      d1.updatedAt = new Date().toISOString();
      d1.duration = Number(req.body.duration) || 0;
      writeDB(db1);

      // YOLO 호출 (FastAPI는 업로드 필드명을 image로 받음)
      const typeForYolo =
        type === "person_male" || type === "person_female" ? "person" : type;
      const yolo = await runYOLOAnalysis(absPath, typeForYolo);
      console.log("[DEBUG] YOLO 호출 absPath:", absPath, fs.existsSync(absPath));

      // ✅ 기존 interpretYOLOResult 호출 부분을 아래처럼 수정 10월 9일
      // const penUsage =
      //   typeof req.body.penUsage === "string"
      //     ? JSON.parse(req.body.penUsage)
      //     : req.body.penUsage || null;

      // const firstGender =
      //   req.body.first_gender || req.body.firstGender || null;

      //✅ 캐시된 값으로 교체 (req.body는 이미 비어 있음)
        const penUsage = cachedPenUsage;
        const firstGender = cachedFirstGender;

      // 룰 해석 → 객체별 meaning 생성(라벨/위치/면적 기준)
      const analysis = interpretYOLOResult(
        yolo,
        typeForYolo,
        Number(req.body.eraseCount) || 0,
        Number(req.body.resetCount) || 0,
        penUsage // ✅ 추가: 펜 굵기 분석 데이터 전달 10월 9일
      );
      
      // ✅ 세션 정보 업데이트 (first_gender를 세션에 반영)
      if (firstGender && session) {
        session.first_gender = firstGender;
        writeDB(db); // ✅ 세션 업데이트 즉시 저장 (GPT 종합 시 반영되도록)
      }      

      // 결과 저장 (남/여는 subtype으로 보존)
      const db2 = readDB();
      const s2 = db2.find((s) => s.id === session_id);
      const d2 = s2?.drawings?.find((d) => d.id === drawingId);
      if (!d2) return;
      d2.status = "done";
      d2.result = { yolo, analysis, subtype: type, bbox_url: yolo?.bbox_url };
      d2.updatedAt = new Date().toISOString();
      writeDB(db2);

      // 🔹 (새) 그림별 상담자용 요약 생성 — 객체/라벨/수치 언급 금지
      try {
        const dbA = readDB();
        const sA = dbA.find((s) => s.id === session_id);
        const name = (sA?.name || "").trim();
        const dA = sA?.drawings?.find((d) => d.id === drawingId);

        if (dA) {
          const { summary } = await summarizeDrawingForCounselor(
            {
              type,
              result: { analysis, subtype: type },
              erase_count: Number(dA.erase_count) || 0,
              reset_count: Number(dA.reset_count) || 0,
              first_gender: sA?.first_gender || firstGender || null,
            },
            {
              name,
              gender: sA?.gender || null,
              first_gender: sA?.first_gender || firstGender || null,
            }
          );

          dA.result.counselor_summary = summary;
          dA.updatedAt = new Date().toISOString();
          writeDB(dbA);
        }

        // 콘솔 확인(선택)
        console.log("\n[🖼 그림별 종합해석] type=", type);
        console.log("[🔍 객체별 해석]", analysis);
      } catch (e) {
        console.error("summarizeDrawingForCounselor 실패:", e?.message || e);
      }


      // 🔹 (새) 네 장이 모두 끝나면 전체 종합 생성
      try {
        const dbAfter = readDB();
        const sessionAfter = dbAfter.find((s) => s.id === session_id);
        const doneDrawings = (sessionAfter?.drawings || []).filter(
          (d) => d.status === "done"
        );

        // ✅ 타입별로 최신 그림만 추림
        const latestByType = {};
        for (const d of doneDrawings) {
          latestByType[d.type] = d; // 같은 type이면 최신으로 덮어씀
        }

        // ✅ 4가지 타입 확인
        const requiredTypes = ["house", "tree", "person_male", "person_female"];
        const doneTypes = Object.keys(latestByType);
        const allDone = requiredTypes.every((t) => doneTypes.includes(t));

        if (allDone && !sessionAfter.summary_overall) {
          const entries = requiredTypes.map((t) => ({
            type: t,
            summary: latestByType[t]?.result?.counselor_summary || "",
          }));

          const name = (sessionAfter?.name || "").trim();
          const overall = await synthesizeOverallFromDrawingSummaries(entries, {
            name,
            gender: sessionAfter.gender,
            first_gender: sessionAfter.first_gender,
          });

          sessionAfter.summary_overall = overall;
          writeDB(dbAfter);

          console.log("\n✅ [GPT 전체 종합 결과 최초 생성 완료]");
        } else if (allDone) {
          console.log("⏩ 이미 summary_overall 존재 — 종합 재생성 생략");
        } else {
          console.log(`[GPT 전체 종합 대기] 현재 완료 ${doneTypes.length}/4`);
        }
      } catch (e) {
        console.error("synthesizeOverallFromDrawingSummaries 실패:", e?.message || e);
      }


    } catch (err) {
      const db3 = readDB();
      const s3 = db3.find((s) => s.id === session_id);
      const d3 = s3?.drawings?.find((d) => d.id === drawingId);
      if (d3) {
        d3.status = "error";
        d3.result = { error: String(err?.message || err) };
        d3.updatedAt = new Date().toISOString();
        writeDB(db3);
      }
      console.error("[DRAWINGS] error:", err?.message || err);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 상태 확인
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:sessionId/:drawingId/status", (req, res) => {
  const db = readDB();
  const session = db.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "세션 없음" });
  const drawing = (session.drawings || []).find(
    (d) => d.id === req.params.drawingId
  );
  if (!drawing) return res.status(404).json({ message: "그림 없음" });
  res.json({ status: drawing.status });
});

// 3) 결과 확인
router.get("/:sessionId/:drawingId/result", (req, res) => {
  const db = readDB();
  const session = db.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "세션 없음" });
  const drawing = (session.drawings || []).find(
    (d) => d.id === req.params.drawingId
  );
  if (!drawing) return res.status(404).json({ message: "그림 없음" });
  res.json({ status: drawing.status, result: drawing.result });
});

// 4) 세션의 모든 그림(디버그)
router.get("/:sessionId", (req, res) => {
  const db = readDB();
  const session = db.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "세션 없음" });
  res.json({ drawings: session.drawings || [] });
});

// 5) 특정 그림 전체 레코드(디버그)
router.get("/:sessionId/:drawingId/debug", (req, res) => {
  const db = readDB();
  const session = db.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "세션 없음" });
  const drawing = (session.drawings || []).find(
    (d) => d.id === req.params.drawingId
  );
  if (!drawing) return res.status(404).json({ message: "그림 없음" });
  res.json(drawing);
});

// ✅ 6) [NEW] Step2용: 특정 세션에서 type별 그림 찾기
router.get("/:session_id/:type", (req, res) => {
  try {
    const { session_id, type } = req.params;
    const db = readDB();
    const session = db.find((s) => String(s.id) === String(session_id));

    if (!session) {
      return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
    }

    // type (house/tree/person 등)에 맞는 그림 찾기
    const drawings = session.drawings || [];
    const found = drawings.find((d) => {
      if (type === "person") {
        return (
          d.type === "person" ||
          d.type === "person_male" ||
          d.type === "person_female"
        );
      }
      // house나 tree 등은 정확히 일치하는 것만 반환
      return d.type === type;
    });


    if (!found) {
      return res.status(404).json({ error: "해당 타입의 그림을 찾을 수 없습니다." });
    }

    res.json({
      image: found.path || found.result?.image,
      type: found.type,
      drawing_id: found.id,
      status: found.status,
    });
  } catch (err) {
    console.error("❌ [GET /:session_id/:type] 오류:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

module.exports = router;