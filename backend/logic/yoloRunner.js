// backend/logic/yoloRunner.js

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function runYOLOAnalysis(imagePath, type = "house") {
  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath));

  const response = await axios.post(
    `http://localhost:8000/analyze/${type}`,
    form,
    { headers: form.getHeaders() }
  );

  return response.data.objects || []; // Python 서버 응답 구조에 맞게
}

module.exports = { runYOLOAnalysis };
