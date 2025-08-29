// backend/logic/yoloRunner.js
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const YOLO_BASE_URL = process.env.YOLO_BASE_URL || "http://127.0.0.1:8000";
const YOLO_FIELD_NAME = process.env.YOLO_FIELD_NAME || "image";

async function runYOLOAnalysis(imagePath, type = "house") {
  const absPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.join(process.cwd(), imagePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`[YOLO] image not found: ${absPath}`);
  }

  const form = new FormData();
  form.append(YOLO_FIELD_NAME, fs.createReadStream(absPath));

  const url = `${YOLO_BASE_URL}/analyze/${type}`;
  console.log(`[YOLO] POST ${url} field=${YOLO_FIELD_NAME}`);
  console.log(`[YOLO] file=${absPath}`);

  try {
    const resp = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000,
    });
    const data = resp.data;
    if (data?.error) throw new Error(`[YOLO] ${data.error}`);
    if (!data || !Array.isArray(data.objects)) {
      throw new Error("[YOLO] invalid response: no objects");
    }
    return data;
  } catch (err) {
    const code = err.response?.status;
    const body = err.response?.data;
    console.error("[YOLO] request failed:", code, body || err.message);
    throw new Error(
      `YOLO request failed${code ? ` (${code})` : ""}: ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }
}

module.exports = { runYOLOAnalysis };
