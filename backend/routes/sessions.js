// routes/sessions.js

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const puppeteer = require("puppeteer");
const axios = require("axios");
const FormData = require("form-data");

const { interpretMultipleDrawings } = require("../logic/gptPrompt");
const { interpretYOLOResult } = require("../logic/analyzeResult");

const DB_FILE = path.join(__dirname, "../models/db.json");

console.log("✅ sessions.js loaded");

// -----------------------
// 1. 검사 시작
// -----------------------
router.post("/start", async (req, res) => {
  const { name, gender, birth, password } = req.body;

  if (!name || !gender || !birth || !password) {
    return res.status(400).json({ message: "모든 값을 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newSession = {
      id: Date.now().toString(),
      name,
      gender,
      birth,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    const db = fs.existsSync(DB_FILE)
      ? JSON.parse(fs.readFileSync(DB_FILE))
      : [];
    db.push(newSession);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    res.status(201).json({
      message: "검사 세션이 저장되었습니다.",
      session_id: newSession.id,
    });
  } catch (err) {
    console.error("저장 오류:", err);
    res.status(500).json({ message: "서버 오류로 저장 실패" });
  }
});

// -----------------------
// 2. 검사 결과 조회
// -----------------------
router.post("/find", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "이름과 비밀번호를 입력해주세요." });
  }

  try {
    const db = fs.existsSync(DB_FILE)
      ? JSON.parse(fs.readFileSync(DB_FILE))
      : [];
    const matchingSessions = [];

    for (const session of db) {
      if (session.name === name) {
        const match = await bcrypt.compare(password, session.password);
        if (match) matchingSessions.push(session);
      }
    }

    if (matchingSessions.length === 0) {
      return res
        .status(404)
        .json({ message: "일치하는 검사 결과가 없습니다." });
    }

    res
      .status(200)
      .json({ message: "검사 결과 조회 성공", results: matchingSessions });
  } catch (err) {
    console.error("조회 오류:", err);
    res.status(500).json({ message: "서버 오류로 조회 실패" });
  }
});

// -----------------------
// 3. 그림 업로드
// -----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

router.post("/upload-drawing", upload.single("drawing"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "그림 파일이 없습니다." });
  }

  res.status(200).json({
    message: "그림이 성공적으로 업로드되었습니다.",
    filename: req.file.filename,
    path: "/uploads/" + req.file.filename,
  });
});

// -----------------------
// 4. 그림 업로드 + YOLO 분석
// -----------------------
router.post("/analyze-drawing", upload.single("drawing"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "그림 파일이 없습니다." });
    }

    const drawingType = req.body.type || "house";
    const absPath = path.join(__dirname, "../uploads", req.file.filename);

    const form = new FormData();
    form.append("image", fs.createReadStream(absPath));

    const yoloResponse = await axios.post(
      `http://localhost:8000/analyze/${drawingType}`,
      form,
      { headers: form.getHeaders() }
    );

    //console.log("📥 YOLO 응답 원본:", yoloResponse);
    console.log("📦 yoloResponse.data:", yoloResponse?.data);

    const yoloResultRaw = yoloResponse.data;

    // YOLO 응답이 배열이면 objects 필드로 래핑
    const yoloResult = Array.isArray(yoloResultRaw)
      ? { type: drawingType, objects: yoloResultRaw }
      : yoloResultRaw;

    if (!yoloResult || !Array.isArray(yoloResult.objects)) {
      console.log("🚨 yoloResult.objects 문제 있음:", yoloResult.objects);
      throw new Error("YOLO 응답 구조가 예상과 다릅니다.");
    }

    const interpreted = interpretYOLOResult(yoloResult, drawingType);

    res.status(200).json({
      message: "그림 업로드 및 분석 완료",
      filename: req.file.filename,
      path: "/uploads/" + req.file.filename,
      analysis: interpreted,
    });
  } catch (err) {
    console.error("🚨 YOLO 분석 실패:");
    console.error("에러 타입:", typeof err);
    console.error("에러 전체:", err);
    console.error("스택:", err.stack);
    res.status(500).json({
      message: "분석 실패",
      error: err?.message || "서버 내부 오류",
    });
  }
});

// -----------------------
// 5. GPT 프롬프트 해석
// -----------------------
router.post("/interpret", async (req, res) => {
  try {
    const { drawings } = req.body;
    if (!drawings || !Array.isArray(drawings) || drawings.length !== 4) {
      return res.status(400).json({ error: "4개의 그림 정보가 필요합니다" });
    }

    const result = await interpretMultipleDrawings(drawings);
    res.json({ success: true, result });
  } catch (err) {
    console.error("GPT 오류:", err);
    res.status(500).json({ error: "GPT 해석 실패", detail: err.message });
  }
});

// -----------------------
// 6. PDF로 변환
// -----------------------
router.post("/generate-pdf", async (req, res) => {
  const { html, filename } = req.body;
  if (!html || !filename) {
    return res
      .status(400)
      .json({ message: "html과 filename을 모두 보내주세요." });
  }

  const pdfPath = path.join(__dirname, "../uploads", `${filename}.pdf`);

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4" });

    await browser.close();

    res
      .status(200)
      .json({ message: "PDF 생성 완료", path: `/uploads/${filename}.pdf` });
  } catch (err) {
    console.error("PDF 생성 오류:", err);
    res.status(500).json({ message: "PDF 생성 실패" });
  }
});

module.exports = router;
