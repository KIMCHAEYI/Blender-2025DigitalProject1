const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function runYOLOAnalysis(imagePath) {
  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath));

  const response = await axios.post("http://localhost:8000/detect", form, {
    headers: form.getHeaders(),
  });

  return response.data; // YOLO 인식 결과: [{ label, x, y, w, h }, ...]
}

module.exports = { runYOLOAnalysis };
