// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const sessionRoutes = require("./routes/sessions");
const analyzeRoute = require("./routes/analyzeRoute");
const drawingsRouter = require("./routes/drawings");
const colorRoute = require("./routes/colorRoute");
const step2Route = require("./routes/step2Route"); 

const app = express();
const PORT = 5000;

// CORS 설정
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/step2", require("./routes/step2Route"));

app.use(express.json());

// 업로드된 이미지 접근 허용
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ 모든 라우트를 listen 전에 등록해야 함
app.use("/api/sessions", sessionRoutes);   // 세션 관리
app.use("/api/analyze", analyzeRoute);     // YOLO 분석
app.use("/api/drawings", drawingsRouter);  // 그림 업로드
app.use("/api/color-analyze", colorRoute); // ✅ 2단계 색상 분석 추가 (올바른 위치)
app.use("/api/step2", step2Route); // ✅ CORS 적용 이후 등록

// ✅ 서버 실행
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ Upload endpoint: http://localhost:${PORT}/api/drawings/upload`);
});
