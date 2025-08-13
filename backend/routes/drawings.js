// backend/routes/drawings.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { runYOLOAnalysis } = require("../logic/yoloRunner");
const { interpretYOLOResult } = require("../logic/analyzeResult");

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
// 업로드: 원본 확장자 유지(가능하면) + uploads 폴더 저장
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, "../uploads");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // 확장자 보존 시도
    let ext = path.extname(file.originalname || "") || "";
    if (!ext) {
      // mime으로 추정
      if (file.mimetype === "image/png") ext = ".png";
      else if (file.mimetype === "image/jpeg") ext = ".jpg";
      else if (file.mimetype === "image/webp") ext = ".webp";
    }
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${
      ext || ""
    }`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ─────────────────────────────────────────────────────────────────────────────
// 1) 업로드 + 백그라운드 YOLO 분석
//    POST /api/drawings/upload
//    form-data: drawing(file), type(text), session_id(text)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", upload.single("drawing"), (req, res) => {
  const { session_id, type } = req.body;

  if (!session_id || !type || !req.file) {
    return res.status(400).json({ message: "session_id, type, drawing 필수" });
  }

  const filename = req.file.filename; // 파일명
  const relPath = "/uploads/" + filename; // 브라우저 접근용 경로
  const absPath = req.file.path; // YOLO에 넘길 절대경로
  const now = new Date().toISOString();

  const db = readDB();
  const session = db.find((s) => s.id === session_id);
  if (!session) {
    return res.status(404).json({ message: "세션을 찾을 수 없습니다" });
  }
  if (!session.drawings) session.drawings = [];

  const drawingId = Date.now().toString();

  session.drawings.push({
    id: drawingId,
    type,
    filename,
    path: relPath,
    absPath, // ★ YOLO 호출 시 사용할 절대경로
    status: "uploaded",
    result: null,
    createdAt: now,
    updatedAt: now,
  });
  writeDB(db);

  console.log(
    `[DRAWINGS] uploaded s=${session_id} d=${drawingId} type=${type} file=${filename}`
  );

  // 업로드 응답은 즉시 반환 → 프론트는 다음 화면으로 넘어갈 수 있음
  res.status(200).json({
    message: "그림 업로드 완료 (분석은 백그라운드)",
    drawing_id: drawingId,
    path: relPath,
  });

  // ── 백그라운드 분석 시작 ───────────────────────────────────────────────
  process.nextTick(async () => {
    try {
      // 1) status: processing
      const db1 = readDB();
      const s1 = db1.find((s) => s.id === session_id);
      const d1 = s1?.drawings?.find((d) => d.id === drawingId);
      if (!d1) {
        console.error("[DRAWINGS] not found before processing");
        return;
      }
      d1.status = "processing";
      d1.updatedAt = new Date().toISOString();
      writeDB(db1);
      console.log(`[DRAWINGS] processing d=${drawingId} → YOLO`);

      // 2) YOLO 호출 (절대경로 그대로 사용)
      const yolo = await runYOLOAnalysis(absPath, type); // { type, objects: [...] }

      // 3) 해석(우리 로직)
      //    ※ 기존 'analyzeDrawing' 아님. 'interpretYOLOResult(yolo, type)' 를 사용
      const analysis = interpretYOLOResult(yolo, type);

      // 4) status: done
      const db2 = readDB();
      const s2 = db2.find((s) => s.id === session_id);
      const d2 = s2?.drawings?.find((d) => d.id === drawingId);
      if (!d2) {
        console.error("[DRAWINGS] not found before done");
        return;
      }
      d2.status = "done";
      d2.result = { yolo, analysis };
      d2.updatedAt = new Date().toISOString();
      writeDB(db2);

      console.log(
        `[DRAWINGS] done d=${drawingId} objects=${
          Array.isArray(yolo.objects) ? yolo.objects.length : 0
        }`
      );
    } catch (err) {
      // 5) status: error
      const db3 = readDB();
      const s3 = db3.find((s) => s.id === session_id);
      const d3 = s3?.drawings?.find((d) => d.id === drawingId);
      if (d3) {
        d3.status = "error";
        d3.result = { error: String(err?.message || err) };
        d3.updatedAt = new Date().toISOString();
        writeDB(db3);
      }
      console.error(`[DRAWINGS] error d=${drawingId}:`, err?.message || err);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 상태 확인
//    GET /api/drawings/:sessionId/:drawingId/status
//    → { status: "uploaded|processing|done|error" }
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

// ─────────────────────────────────────────────────────────────────────────────
// 3) 결과 확인
//    GET /api/drawings/:sessionId/:drawingId/result
//    → { status, result: { yolo, analysis } }
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 4) (옵션) 해당 세션의 모든 그림 보기 – 디버그 편의용
//    GET /api/drawings/:sessionId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:sessionId", (req, res) => {
  const db = readDB();
  const session = db.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "세션 없음" });
  res.json({ drawings: session.drawings || [] });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) (옵션) 특정 그림의 전체 레코드(디버그)
//    GET /api/drawings/:sessionId/:drawingId/debug
// ─────────────────────────────────────────────────────────────────────────────
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
