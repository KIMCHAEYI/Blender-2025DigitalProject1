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
async function summarizeDrawingForCounselor(draw, opts = {}) {
  const name = (opts.name || "").trim();
  const type = draw?.type || "unknown";
  const subtype = draw?.result?.subtype || draw?.subtype || type;
  const analysis = Array.isArray(draw?.result?.analysis)
    ? draw.result.analysis
    : [];

  // 룰 해석 텍스트를 '근거 재료'로만 사용(라벨은 밖으로 내지 않게)
  const bullets = analysis
    .map((a) => `- ${a.meaning || ""}`.trim())
    .filter(Boolean)
    .join("\n");

  const openingRule = name
    ? `첫 문장은 반드시 "${name}님은 ..."으로 시작하라.`
    : `첫 문장은 내담자의 특성을 한 문장으로 요약하라.`;

  const { choices } = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.25,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "너는 HTP 검사 상담 보고서 작성자다. 아래 '근거 재료'는 내부 참고용이며, " +
          "최종 요약에는 객체명/부분명/라벨(예: 창문, 문, 가지, 뿌리 등)이나 위치, 면적 수치 등을 절대 노출하지 마라. " +
          "과장/단정 금지, 중복 제거, 자연스러운 한국어. 사진 예시처럼 따뜻하고 차분한 톤. 한 문단 6~10문장.",
      },
      {
        role: "user",
        content: `대상 그림 유형: ${subtype}
${openingRule}
- 라벨/객체명을 직접 언급하거나 특정 요소에서 어떤 해석이 나왔는지 연결하지 마라.
- 필요한 경우에만 ( ) 안에 아주 짧게 '전반적으로 드러나는 경향' 정도만 표기.
- 임상명칭·진단 금지. 가설 어조 사용(가능성이 있다/시사한다 등).

[근거 재료(내부 참고)]
${bullets || "(없음)"}

이 재료를 바탕으로 상담자에게 전달할 한 문단 요약을 작성하라.`,
      },
    ],
  });

  const text = choices?.[0]?.message?.content?.trim() || "";
  return { summary: text };
}

async function interpretMultipleDrawings(drawings, opts = {}) {
  if (!Array.isArray(drawings)) {
    throw new Error("drawings must be an array");
  }

  const summaries = [];
  for (const draw of drawings) {
    const { summary } = await summarizeDrawingForCounselor(draw, opts);
    const rawType = draw?.type || "unknown";
    const subtype = draw?.result?.subtype || draw?.subtype || rawType;
    const normType = keyOf(rawType, subtype);
    summaries.push({ type: normType, summary });
  }

  return await synthesizeOverallFromDrawingSummaries(summaries, opts);
}

// ========= 2) 그림별 요약들을 모아 전체 종합 =========
// entries: Array<{ type, summary }>  // summary는 위 함수 결과
// opts: { name?: string }
// return: { personalized_overall, strengths, cautions, per_drawing }
async function synthesizeOverallFromDrawingSummaries(entries, opts = {}) {
  const name = (opts.name || "").trim();

  const perMap = {};
  for (const e of entries) {
    const t = e.type;
    if (t === "person_male") perMap.person_man = e.summary;
    else if (t === "person_female") perMap.person_woman = e.summary;
    else perMap[t] = e.summary; // house, tree, person
  }

  const perList = Object.entries(perMap)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const nameRule = name
    ? `첫 문장은 반드시 "${name}님은 ..."으로 시작하라.`
    : "첫 문장은 내담자의 특성을 한 문장으로 요약하라.";

  const { choices } = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.25,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          "너는 HTP 검사 '전체 종합' 보고서 작성자다. 아래 입력은 그림별 종합 요약이다. " +
          "최종 출력에는 객체명/라벨과 같은 구체 요소를 드러내지 마라. 과장/단정 금지. 중복 제거. 따뜻하고 상담자 친화적.",
      },
      {
        role: "user",
        content: `아래 그림별 종합 요약들을 근거로 전체 종합을 JSON으로만 작성하라.

요구 스키마:
{
  "personalized_overall": string,  // 8~12문장, ${nameRule}
  "strengths": string[],           // 2~4개 (각 항목 끝에 간단한 근거 표현 가능: (일관성, 집중경향 등))
  "cautions": string[],            // 2~4개 (가설 어조)
  "per_drawing": {                 // 입력에 있는 항목만 포함
    "house"?: string,
    "tree"?: string,
    "person_man"?: string,
    "person_woman"?: string,
    "person"?: string
  }
}

[그림별 종합 요약]
${perList || "(없음)"}

주의:
- 특정 객체/라벨/위치/수치와 연결짓는 표현 금지.
- 중복을 합치고 자연스럽게 담아라.`,
      },
    ],
  });

  const raw = choices?.[0]?.message?.content?.trim() || "{}";
  let parsed;
  try {
    const t = raw.replace(/^```json\s*/i, "").replace(/```$/i, "");
    parsed = JSON.parse(t);
  } catch {
    parsed = { personalized_overall: raw, per_drawing: perMap };
  }

  return {
    personalized_overall: parsed.personalized_overall || "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    per_drawing: parsed.per_drawing || perMap,
  };
}

module.exports = {
  interpretMultipleDrawings, // 기존 전체(analysis 직접) -> 전체 종합
  summarizeDrawingForCounselor, // 🔹신규: 단일 그림 요약
  synthesizeOverallFromDrawingSummaries, // 🔹신규: 그림별 요약 → 전체 종합
};
