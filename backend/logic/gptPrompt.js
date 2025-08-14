// backend/logic/gptPrompt.js — detailed synthesis with name & JSON
require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// person_male/female → 키 보정
const keyOf = (type, subtype) => {
  if (type === "person") {
    if (subtype === "person_male") return "person_male";
    if (subtype === "person_female") return "person_female";
  }
  if (type === "person_male") return "person_male";
  if (type === "person_female") return "person_female";
  return type; // house | tree | person
};

// 입력 items → 프롬프트 블록
function blocksFrom(items) {
  return items
    .map((it, i) => {
      const lines = (it.analysis || []).map((a) =>
        `- ${a.label ?? ""} ${a.meaning ?? ""}`.trim()
      );
      return `[#${i + 1} ${it.type}${it.subtype ? `/${it.subtype}` : ""}]
${lines.length ? lines.join("\n") : "(해석 없음)"}`;
    })
    .join("\n\n");
}

// 메시지 생성 (이름을 넣으면 첫 문장을 "{이름}님은..."으로 시작하도록 강제)
function buildMessages(items, name) {
  const blocks = blocksFrom(items);
  const nameLine = name ? `이름: ${name}\n\n` : "";
  const openingRule = name
    ? `첫 문장은 반드시 "${name}님은 ..."으로 시작하라.`
    : `첫 문장은 내담자의 특성을 한 문장으로 요약하라.`;

  return [
    {
      role: "system",
      content:
        "너는 HTP 검사 보고서 편집자다. 중복/과장/단정 금지. " +
        "가능한 한 많은 근거(객체 라벨)를 활용하되 같은 의미 반복은 피한다. " +
        "오로지 JSON만 반환하고, 불필요한 텍스트/마크다운을 절대 출력하지 마라.",
    },
    {
      role: "user",
      content: `${nameLine}아래는 YOLO+룰 해석으로 생성된 '의미(meaning)' 목록이다. 이를 근거로 JSON만 반환하라.

요구 스키마:
{
  "personalized_overall": string,   // 6~10문장. ${openingRule} 문장 내에서 근거는 (창문·문, 가지 등)처럼 간단히 괄호 표기.
  "strengths": string[],            // 2~4개 강점. 각 항목 끝에 간단 근거 괄호.
  "cautions": string[],             // 2~4개 유의/상담 시사점. 과장 금지, 필요한 경우만 가설로 표기.
  "per_drawing": {                  // 입력에 존재한 유형만 포함(없으면 생략 가능)
    "house"?: string,
    "tree"?: string,
    "person_man"?: string,
    "person_woman"?: string,
    "person"?: string
  }
}

작성 지침:
- 의미문들을 최대한 활용하되, 같은 의미 반복은 제거하라.
- 가설은 "가능성이 있다", "시사한다" 정도의 어조로 제한하라.
- 임상명칭/진단명은 사용하지 말라.

[입력 해석 목록]
${blocks}`,
    },
  ];
}

function safeParseJSON(s) {
  try {
    const t = s
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "");
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/**
 * drawings: [{ type, result: { analysis:[{label,meaning}], subtype? } }, ...]
 * opts: { name?: string, model?, temperature?, max_tokens? }
 * return: { personalized_overall, strengths, cautions, per_drawing, raw }
 */
async function interpretMultipleDrawings(drawings, opts = {}) {
  // 1) YOLO 룰 해석만 추출 (result.analysis)  ← YOLO 응답은 yoloRunner→FastAPI 경유:contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1},
  //    해석은 analyzeResult에서 position/area 등 계산 후 meaning을 만듭니다:contentReference[oaicite:2]{index=2}.
  const items = drawings.map((d) => {
    const rawType = d.type || "unknown";
    const subtype = d.result?.subtype || d.subtype;
    const type =
      rawType === "person_male" || rawType === "person_female"
        ? "person"
        : rawType;
    const analysis = Array.isArray(d.result?.analysis) ? d.result.analysis : [];
    return { type, subtype, analysis };
  });

  // 2) GPT 호출
  const messages = buildMessages(items, opts.name?.trim());
  const { choices } = await openai.chat.completions.create({
    model: opts.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.max_tokens ?? 1100,
    messages,
  });

  const raw = choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJSON(raw) || {};

  // 3) per_drawing 키 보정(입력에 있던 유형만 최소 보장)
  const per = parsed.per_drawing || {};
  for (const it of items) {
    const k = keyOf(it.type, it.subtype);
    if (!(k in per)) per[k] = "";
  }

  return {
    personalized_overall: parsed.personalized_overall || "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    per_drawing: per,
    raw,
  };
}

// 콘솔 출력 헬퍼(선택)
async function synthesizeToConsole(drawings, opts = {}) {
  const out = await interpretMultipleDrawings(drawings, opts);
  const line = "─".repeat(80);
  console.log("\n" + line);
  console.log("🧠 GPT 종합 결과 (server-side console)\n");
  if (out.personalized_overall) {
    console.log(out.personalized_overall.trim() + "\n");
  }
  if (out.strengths?.length) {
    console.log("✅ Strengths");
    out.strengths.forEach((s) => console.log("- " + s));
    console.log("");
  }
  if (out.cautions?.length) {
    console.log("⚠️  Cautions");
    out.cautions.forEach((c) => console.log("- " + c));
    console.log("");
  }
  const pd = out.per_drawing || {};
  const keys = Object.keys(pd).filter((k) => (pd[k] || "").trim());
  if (keys.length) {
    console.log("🖼  Per Drawing");
    keys.forEach((k) => console.log(`- ${k}: ${pd[k]}`));
    console.log("");
  }
  console.log(line + "\n");
  return out;
}

module.exports = { interpretMultipleDrawings, synthesizeToConsole };
