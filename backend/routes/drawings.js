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
//    POST /api/drawings/upload  (form-data: drawing(file), type(text), session_id(text))
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", upload.single("drawing"), (req, res) => {
  const { session_id, type } = req.body;
  if (!session_id || !type || !req.file) {
    return res.status(400).json({ message: "session_id, type, drawing 필수" });
  }

  const filename = req.file.filename;
  const relPath = "/uploads/" + filename;
  const absPath = req.file.path;
  const now = new Date().toISOString();

  const db = readDB();
  const session = db.find((s) => s.id === session_id);
  if (!session)
    return res.status(404).json({ message: "세션을 찾을 수 없습니다" });
  if (!session.drawings) session.drawings = [];

  const drawingId = Date.now().toString();

  session.drawings.push({
    id: drawingId,
    type, // person_male | person_female | house | tree
    filename,
    path: relPath,
    absPath,
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

  // ── 백그라운드 분석 시작 ───────────────────────────────────────────────
  process.nextTick(async () => {
    try {
      // 상태: processing
      const db1 = readDB();
      const s1 = db1.find((s) => s.id === session_id);
      const d1 = s1?.drawings?.find((d) => d.id === drawingId);
      if (!d1) return;
      d1.status = "processing";
      d1.updatedAt = new Date().toISOString();
      writeDB(db1);

      // YOLO 호출 (FastAPI는 업로드 필드명을 image로 받음)
      const typeForYolo =
        type === "person_male" || type === "person_female" ? "person" : type;
      const yolo = await runYOLOAnalysis(absPath, typeForYolo);

      // 룰 해석 → 객체별 meaning 생성(라벨/위치/면적 기준)
      const analysis = interpretYOLOResult(yolo, typeForYolo);

      // 결과 저장 (남/여는 subtype으로 보존)
      const db2 = readDB();
      const s2 = db2.find((s) => s.id === session_id);
      const d2 = s2?.drawings?.find((d) => d.id === drawingId);
      if (!d2) return;
      d2.status = "done";
      d2.result = { yolo, analysis, subtype: type };
      d2.updatedAt = new Date().toISOString();
      writeDB(db2);

      // 🔹 (새) 그림별 상담자용 요약 생성 — 객체/라벨/수치 언급 금지
      try {
        const dbA = readDB();
        const sA = dbA.find((s) => s.id === session_id);
        const name = (sA?.name || "").trim();

        const { summary } = await summarizeDrawingForCounselor(
          { type, result: { analysis, subtype: type } },
          { name }
        );

        const dA = sA?.drawings?.find((d) => d.id === drawingId);
        if (dA) {
          dA.result.counselor_summary = summary;
          dA.updatedAt = new Date().toISOString();
          writeDB(dbA);
        }

        // 콘솔 확인(선택)
        console.log("\n[🖼 그림별 종합해석] type=", type);
        console.log("[🔍 객체별 해석]", analysis);
        console.log(summary || "(없음)");
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

        if (doneDrawings.length === 4) {
          const entries = doneDrawings.map((x) => ({
            type: x.type,
            summary: x.result?.counselor_summary || "",
          }));
          const name = (sessionAfter?.name || "").trim();

          const overall = await synthesizeOverallFromDrawingSummaries(entries, {
            name,
          });

          sessionAfter.summary_overall = overall;
          writeDB(dbAfter);

          // 콘솔 출력
          console.log(
            "\n================= 🧠 전체 종합(상담자용) ================="
          );
          console.log(overall.personalized_overall || "(없음)");
          if (overall.strengths?.length) {
            console.log("\n✅ Strengths");
            overall.strengths.forEach((s) => console.log("- " + s));
          }
          if (overall.cautions?.length) {
            console.log("\n⚠️  Cautions");
            overall.cautions.forEach((c) => console.log("- " + c));
          }
          console.log("\n🖼 Per Drawing 요약 →", overall.per_drawing);
          console.log(
            "=========================================================\n"
          );
        } else {
          console.log(
            `[GPT 전체 종합 대기] 현재 완료 ${doneDrawings.length}/4`
          );
        }
      } catch (e) {
        console.error(
          "synthesizeOverallFromDrawingSummaries 실패:",
          e?.message || e
        );
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

module.exports = router;
