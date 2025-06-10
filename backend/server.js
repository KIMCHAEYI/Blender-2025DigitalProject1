const express = require("express");
const path = require("path");
const cors = require("cors");

const sessionRoutes = require("./routes/sessions");
const analyzeRoute = require("./routes/analyzeRoute");

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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/sessions", sessionRoutes);

app.use("/analyze", analyzeRoute);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
