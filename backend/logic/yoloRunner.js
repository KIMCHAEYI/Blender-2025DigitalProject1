// backend/logic/yoloRunner.js
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const YOLO_BASE_URL = process.env.YOLO_BASE_URL || "http://127.0.0.1:8000";
const YOLO_FIELD_NAME = process.env.YOLO_FIELD_NAME || "image";

async function runYOLOAnalysis(imagePath, type = "house") {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`[YOLO] image not found: ${imagePath}`);
  }

  const form = new FormData();
  form.append(YOLO_FIELD_NAME, fs.createReadStream(imagePath));

  const url = `${YOLO_BASE_URL}/analyze/${type}`;
  console.log(`[YOLO] POST ${url} field=${YOLO_FIELD_NAME}`);
  console.log(`[YOLO] file=${imagePath}`);

  try {
    const resp = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000,
    });
    return resp.data;
  } catch (err) {
    console.error("[YOLO] request failed:", err.message);
    throw new Error("YOLO request failed: " + err.message);
  }
}

module.exports = { runYOLOAnalysis };
