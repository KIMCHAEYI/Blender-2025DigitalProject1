// backend/routes/report.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const router = express.Router();

const DB_FILE = path.join(__dirname, "../models/db.json");
const REPORT_DIR = path.join(__dirname, "../uploads/reports");
const PY_FILE = path.join(__dirname, "../logic/reportlab/reportGenerator.py");

// DB 로드
function loadDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

// Python에 보낼 payload 구성
function buildReportPayload(session) {
    const user = {
    name: session?.user?.name || session?.name || "-",
    gender: session?.user?.gender || session?.gender || "-",
    birth: session?.user?.birth || session?.birth || "-",
    };

    const drawings = (session.drawings || []).map((d) => {
    const type =
        d.type || d.result?.type || d.subtype || "unknown";
    const duration = Number(d.duration || d.result?.duration || 0);
    const image = d.image || d.path || d.result?.image || "";
    let analysis = Array.isArray(d.result?.analysis)
        ? d.result.analysis
        : (d.analysis?.analysis || d.analysis || []);
    if (!Array.isArray(analysis)) analysis = [];
    return { type, duration, image, analysis };
    });

    return {
    session_id: session.id,
    created_at: session.created_at || new Date().toISOString(),
    user,
    diagnosis: session.diagnosis || "",
    overall_summary: session.overall_summary || "",
    drawings,
    };
}

// POST /api/report/generate  { session_id }
router.post("/generate", async (req, res) => {
    try {
    const { session_id } = req.body;
    if (!session_id) {
        return res.status(400).json({ error: "session_id 필요" });
    }

    const db = loadDB();
    const session = db.find((s) => String(s.id) === String(session_id));
    if (!session) {
        return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
    }

    await fs.promises.mkdir(REPORT_DIR, { recursive: true });
    const outPdfAbs = path.join(REPORT_DIR, `HTP_${session_id}.pdf`);
    const payload = buildReportPayload(session);
    payload._out_pdf = outPdfAbs;

// ✅ 수정된 버전 (Python 절대경로 지정)
    const py = spawn(
    "C:/Users/82103/Desktop/Blender_2025DigitalProject1/.venv/Scripts/python.exe",
    [PY_FILE],
    {
        stdio: ["pipe", "pipe", "pipe"],
    }
    );
    
    let pyErr = "";
    let pyOut = "";
    py.stdout.on("data", (d) => (pyOut += d.toString()));
    py.stderr.on("data", (d) => (pyErr += d.toString()));

    py.on("close", (code) => {
        if (code !== 0) {
        console.error("ReportLab error:", pyErr);
        return res.status(500).json({ error: "PDF 생성 실패", detail: pyErr });
        }
        const rel = `/uploads/reports/HTP_${session_id}.pdf`;
        return res.json({ path: rel });
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
    } catch (err) {
    console.error("generate-report error:", err);
    res.status(500).json({ error: "서버 오류" });
    }
});

module.exports = router;
