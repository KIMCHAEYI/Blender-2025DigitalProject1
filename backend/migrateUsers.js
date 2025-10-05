// migrateUsers.js
const fs = require("fs");
const path = require("path");
const db = require("./database");

const jsonPath = path.join(__dirname, "models", "db.json");
const users = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, name, gender, birth, password, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertDrawing = db.prepare(`
  INSERT OR IGNORE INTO drawings (user_id, type, filename, uploaded_at)
  VALUES (?, ?, ?, ?)
`);

let userCount = 0;
let drawingCount = 0;

users.forEach((user) => {
  insertUser.run(
    user.id,
    user.name,
    user.gender,
    user.birth,
    user.password,
    user.createdAt
  );
  userCount++;

  // 🖼 drawings도 함께 마이그레이션
  if (user.drawings) {
    Object.entries(user.drawings).forEach(([type, info]) => {
      if (info?.filename) {
        const uploadedAt = info.uploaded_at || new Date().toISOString();
        insertDrawing.run(user.id, type, info.filename, uploadedAt);
        drawingCount++;
      }
    });
  }
});

console.log(`✅ 사용자 ${userCount}명 마이그레이션 완료`);
console.log(`✅ 그림 ${drawingCount}개 마이그레이션 완료`);
