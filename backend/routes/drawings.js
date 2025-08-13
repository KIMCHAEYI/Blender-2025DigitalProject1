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
      const db1 = readDB();
      const s1 = db1.find((s) => s.id === session_id);
      const d1 = s1?.drawings?.find((d) => d.id === drawingId);
      if (!d1) return;
      d1.status = "processing";
      d1.updatedAt = new Date().toISOString();
      writeDB(db1);

      // ★ YOLO는 person으로 통일 (남/여 모델이 같으므로)
      const typeForYolo =
        type === "person_male" || type === "person_female" ? "person" : type;

      const yolo = await runYOLOAnalysis(absPath, typeForYolo);

      // 해석은 기본적으로 person 규칙(필요하면 성별 구분 규칙도 가능)
      const analysis = interpretYOLOResult(yolo, typeForYolo);

      const db2 = readDB();
      const s2 = db2.find((s) => s.id === session_id);
      const d2 = s2?.drawings?.find((d) => d.id === drawingId);
      if (!d2) return;
      d2.status = "done";
      d2.result = { yolo, analysis, subtype: type }; // ★ subtype으로 남/여 보존
      d2.updatedAt = new Date().toISOString();
      writeDB(db2);
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
