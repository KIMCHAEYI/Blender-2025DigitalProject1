// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const sessionRoutes = require("./routes/sessions");
const analyzeRoute = require("./routes/analyzeRoute");
const drawingsRouter = require("./routes/drawings");

const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// 업로드된 이미지 접근 가능하도록 설정
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 세션 라우트
app.use("/api/sessions", sessionRoutes);

// 분석 라우트
app.use("/api/analyze", analyzeRoute);

// 그림 업로드 라우트 (여기 중요!)
app.use("/api/drawings", drawingsRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(
    `✅ Upload endpoint: http://localhost:${PORT}/api/drawings/upload`
  );
});
