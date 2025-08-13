// database.js

const Database = require("better-sqlite3");
const path = require("path");

// SQLite DB 파일 생성 (없으면 자동 생성됨)
const db = new Database(path.join(__dirname, "htp.db"), {
  verbose: console.log, // SQL 쿼리 로그 출력 (개발 중 유용함)
});

// 사용자 테이블 생성
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,         -- ex: "1750004492633"
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    birth TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`
).run();

// 그림 테이블 생성
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,          -- ex: 'house', 'tree', 'person', 'free'
    filename TEXT NOT NULL,      -- ex: 'uploads/1750004492633_house.png'
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`
).run();

module.exports = db;
