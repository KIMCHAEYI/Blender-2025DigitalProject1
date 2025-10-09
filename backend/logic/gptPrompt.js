// backend/logic/gptPrompt.js 
require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const keyOf = (type, subtype) => {
  if (type === "person") {
    if (subtype === "person_male") return "person_male";
    if (subtype === "person_female") return "person_female";
  }
  if (type === "person_male") return "person_male";
  if (type === "person_female") return "person_female";
  return type; // house | tree | person
};

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

async function summarizeDrawingForCounselor(draw, opts = {}) {
  const name = (opts.name || "").trim();
  const type = draw?.type || "unknown";
  const subtype = draw?.result?.subtype || draw?.subtype || type;
  const analysis = Array.isArray(draw?.result?.analysis)
    ? draw.result.analysis
    : [];

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
async function synthesizeOverallFromDrawingSummaries(entries, opts = {}) {
  const name = (opts.name || "").trim();
  const firstGender = opts.first_gender || null;
  const userGender = opts.gender || null;  

  const perMap = {};
  for (const e of entries) {
    const t = e.type;
    if (t === "person_male") perMap.person_man = e.summary;
    else if (t === "person_female") perMap.person_woman = e.summary;
    else perMap[t] = e.summary;
  }

  const perList = Object.entries(perMap)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const nameRule = name
    ? `첫 문장은 반드시 "${name}님은 ..."으로 시작하라.`
    : "첫 문장은 내담자의 특성을 한 문장으로 요약하라.";

  // 성별 선택 해석 규칙
  let genderNote = "";
  if (firstGender && userGender) {
    if (firstGender === userGender) {
      genderNote =
        "먼저 그린 성별이 내담자 자신의 성별과 동일하므로, 자기 동일시가 자연스럽게 이루어지는 일반적인 양상을 반영한다.";
    } else {
      genderNote =
        "먼저 그린 성별이 내담자의 성별과 달라, 성 역할 동일시에 갈등이 있거나, 현재 생활에서 특정 이성에 대해 큰 비중을 두고 있음을 시사한다. (긍정적이든 부정적이든 가능).";
    }
  }

  const { choices } = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.35,           
  max_tokens: 1500,           
  messages: [
    {
      role: "system",
      content:
        "너는 HTP(집-나무-사람) 검사 종합 보고서를 작성하는 전문 상담가다. " +
        "내담자의 그림별 요약을 바탕으로 한 **전체적인 성격, 정서, 대인관계, 심리적 특성**을 종합적으로 기술하라. " +
        "객체명이나 라벨(창문, 문 등)은 절대 언급하지 말고, 따뜻하고 부드러운 톤을 유지하라. " +
        "단정하거나 과장된 표현은 피하고, 문단을 길게 써서 충분히 설명하라. " +
        "전체 글은 **12~18문장** 정도의 길이로 자연스럽게 연결된 문단 형태로 작성하라.",
    },
    {
      role: "user",
      content: `아래 그림별 종합 요약을 참고하여 전체 해석을 JSON으로 작성하라.

요구 스키마:
{
  "personalized_overall": string,
  "per_drawing": {
    "house"?: string,
    "tree"?: string,
    "person_man"?: string,
    "person_woman"?: string
  }
}

주의:
- 특정 객체명, 위치, 수치 언급 금지.
- 중복된 의미는 자연스럽게 통합하라.
- ${genderNote}

[그림별 종합 요약]
${perList || "(없음)"}`,
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

  const overall_summary = parsed.personalized_overall || "";

  const diagnosis_summary = await generateDiagnosisSummary(overall_summary);

  return {
    diagnosis_summary,  
    overall_summary,   
    per_drawing: parsed.per_drawing || perMap,
  };
}


// ========= 3) 색채 해석 =========
async function refineColorAnalysis(rawAnalysis) {
  const { choices } = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content:
          "너는 HTP 검사 색채 해석을 상담 보고서 톤으로 자연스럽게 다듬는 역할이다. " +
          "중복을 줄이고, 따뜻하고 차분한 한국어 문장으로 정리하라. 단정적인 표현은 피하라.",
      },
      {
        role: "user",
        content: `아래 색채 해석 초안을 더 자연스럽게 다듬어줘.
[초안]
${rawAnalysis}`,
      },
    ],
  });

  return choices?.[0]?.message?.content?.trim() || rawAnalysis;
}

module.exports = {
  interpretMultipleDrawings, // 기존 전체(analysis 직접) -> 전체 종합
  summarizeDrawingForCounselor, // 단일 그림 요약
  synthesizeOverallFromDrawingSummaries, // 그림별 요약 → 전체 종합
  refineColorAnalysis, // 색채 해석 
};


// ========= 4) 전문가 진단 필요 여부 =========

async function generateDiagnosisSummary(overallText) {
  if (!overallText?.trim()) return "분석 결과를 기반으로 한 진단이 필요합니다.";

  try {
    const { choices } = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content:
            "너는 HTP(집-나무-사람) 검사 결과를 바탕으로 '진단 필요 여부 요약'만 한 문장으로 작성하는 전문가다. " +
            "아래 중 하나만 출력하라:\n" +
            "- 전문가의 상담이 필요하지 않습니다.\n" +
            "- 전문가와의 상담이 권장됩니다.\n" +
            "- 전문가의 즉각적인 상담이 필요합니다.\n" +
            "문장은 단 한 줄로만 출력하라. 이유나 근거는 작성하지 마라.",
        },
        {
          role: "user",
          content: `전체 해석문:\n${overallText}`,
        },
      ],
    });

    return choices?.[0]?.message?.content?.trim() || "전문가의 상담이 권장됩니다.";
  } catch (err) {
    console.error("❌ diagnosis_summary 생성 실패:", err.message);
    return "전문가와의 상담이 권장됩니다.";
  }
}
