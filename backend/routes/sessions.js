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

// GPT 종합 API(기존): 임의로 4개 그림 분석을 모아 클라이언트가 요약 받고 싶을 때 사용
const { interpretMultipleDrawings } = require("../logic/gptPrompt");
// 룰 해석(객체별 meaning 생성)
const { interpretYOLOResult } = require("../logic/analyzeResult");

const DB_FILE = path.join(__dirname, "../models/db.json");

console.log("✅ sessions.js loaded");


// -----------------------
// 1. 검사 시작
// -----------------------
router.post("/start", async (req, res) => {
  const { name, gender, birth, password, drawings = [], first_gender } = req.body;

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
      first_gender: first_gender || null,   // 🔹 먼저 고른 성별 저장
      createdAt: new Date().toISOString(),
      drawings,
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
// 3. 그림 업로드 (파일만 저장)
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


// -----------------------
// 4. 저장된 이미지 한 장을 YOLO+룰 해석해보기
// -----------------------
router.post("/analyze-saved-drawing", async (req, res) => {
  try {
    const { imagePath, type } = req.body;
    if (!imagePath) {
      return res.status(400).json({ message: "imagePath가 필요합니다." });
    }

    const drawingType = type || "house";
    const absPath = path.join(__dirname, "..", imagePath);

    const form = new FormData();
    form.append("image", fs.createReadStream(absPath));

    const yoloResponse = await axios.post(
      `http://localhost:8000/analyze/${drawingType}`,
      form,
      { headers: form.getHeaders() }
    );

    const yoloResultRaw = yoloResponse.data;
    const yoloResult = Array.isArray(yoloResultRaw)
      ? { type: drawingType, objects: yoloResultRaw }
      : yoloResultRaw;

    if (!yoloResult || !Array.isArray(yoloResult.objects)) {
      throw new Error("YOLO 응답 구조가 예상과 다릅니다.");
    }

    const interpreted = interpretYOLOResult(yoloResult, drawingType);

    res.status(200).json({
      message: "기존 이미지 분석 완료",
      analysis: interpreted,
    });
  } catch (err) {
    console.error("🚨 저장된 그림 분석 실패:", err);
    res.status(500).json({ message: "분석 실패", error: err.message });
  }
});

// -----------------------
// 5. GPT 종합 API (기존 유지)
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

// -----------------------
// 7. 먼저 그릴 성별(first_gender) 
// -----------------------
router.post("/update-first-gender", (req, res) => {
  const { session_id, first_gender } = req.body;

  if (!session_id || !first_gender) {
    return res
      .status(400)
      .json({ message: "session_id와 first_gender가 필요합니다." });
  }

  try {
    if (!fs.existsSync(DB_FILE)) {
      return res.status(404).json({ message: "DB 파일을 찾을 수 없습니다." });
    }

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const session = db.find((s) => s.id === session_id);

    if (!session) {
      return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
    }

    session.first_gender = first_gender;
    session.updatedAt = new Date().toISOString();

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    console.log(`✅ [first_gender 업데이트 완료] ${session_id} → ${first_gender}`);
    res.json({
      message: "먼저 그릴 성별이 저장되었습니다.",
      session_id,
      first_gender,
    });
  } catch (err) {
    console.error("❌ first_gender 업데이트 실패:", err.message);
    res.status(500).json({ message: "서버 오류로 업데이트 실패" });
  }
});


// -----------------------
// 8. 업로드된 그림을 DB에 반영
// -----------------------
router.post("/upload", upload.single("image"), (req, res) => {
  const { session_id, type } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
  }
  if (!session_id || !type) {
    return res.status(400).json({ message: "session_id와 type이 필요합니다." });
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const session = db.find((s) => s.id === session_id);

    if (!session) {
      return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
    }

    // 새로운 그림 객체 추가
    const newDrawing = {
      type,
      file_name: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
    };

    session.drawings.push(newDrawing);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    console.log(`✅ [그림 업로드 완료] ${type} → ${req.file.filename}`);
    res.json({ message: "그림 업로드 완료", drawing: newDrawing });
  } catch (err) {
    console.error("❌ 그림 업로드 처리 실패:", err);
    res.status(500).json({ message: "서버 오류로 업로드 실패" });
  }
});

module.exports = router;
