// backend/logic/gptPrompt.js 
require("dotenv").config();
const OpenAI = require("openai");

let openai;
(async () => {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
})();

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

// ========= 1) 단일 그림 요약 =========
async function summarizeDrawingForCounselor(draw, opts = {}) {
  const name = (opts.name || "").trim();
  const userGender = String(opts.gender || "").toLowerCase();
  const firstGenderOpt = String(opts.first_gender || "").toLowerCase();

  const type = draw?.type || "unknown";
  const subtype = draw?.result?.subtype || draw?.subtype || type;

  // analysis 배열 안전 추출
  const analysisArr = Array.isArray(draw?.result?.analysis)
    ? draw.result.analysis
    : Array.isArray(draw?.analysis)
    ? draw.analysis
    : [];

  // 행동 수치 (없으면 0)
  const eraseCount = Number(draw?.erase_count ?? opts.erase_count ?? 0);
  const resetCount = Number(draw?.reset_count ?? opts.reset_count ?? 0);

  // 1) 존재/미표현/행동 신호 정리
  const PRESENT_EXCLUDE = new Set(["지우기 사용", "리셋 사용", "펜 굵기 사용"]);
  const present = analysisArr.filter(
    (a) => typeof a?.label === "string" && !a.label.includes("(미표현)") && !PRESENT_EXCLUDE.has(a.label)
  );
  const missing = analysisArr.filter((a) => typeof a?.label === "string" && a.label.includes("(미표현)"));
  const behaviors = analysisArr
    .filter((a) => ["지우기 사용", "리셋 사용", "펜 굵기 사용"].includes(a?.label))
    .map((a) => `- ${a.meaning}`)
    .join("\n");

  // 사람 그림일 때만 성별 신호 반영
  const isPerson = ["person", "person_male", "person_female"].some((t) => subtype.startsWith(t) || t === subtype);
  const firstGender =
    firstGenderOpt || String(draw?.first_gender || "").toLowerCase();

  let genderNote = "";
  if (isPerson && firstGender && userGender) {
    genderNote =
      firstGender === userGender
        ? "먼저 선택한 성별이 본인과 같음 → 자기 동일시의 자연스러운 경향."
        : "먼저 선택한 성별이 본인과 다름 → 성역할 동일시의 갈등 또는 특정 이성에 대한 주제의식.";
  }

  // 최종 bullet 재료(객체명 비노출: meaning만)
  const meaningBullets = present
    .map((a) => `- ${a?.meaning || ""}`.trim())
    .filter(Boolean)
    .join("\n");

  // 신호 요약(모델이 간접 서술하도록 지시)
  const signals = [
    missing.length ? `누락 요소 ${missing.length}개(객체명 비공개)` : null,
    `지우기 ${eraseCount}회`,
    `리셋 ${resetCount}회`,
    behaviors ? `행동 해석\n${behaviors}` : null,
    genderNote || null,
  ]
    .filter(Boolean)
    .join("\n");

  const openingRule = name
    ? `첫 문장은 반드시 "${name}님은 ..."으로 시작하라.`
    : `첫 문장은 내담자의 특성을 한 문장으로 요약하라.`;

  const { choices } = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.45,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "너는 HTP 상담 보고서 작성자다. " +
          "최종 요약에는 객체명/부분명/좌표/면적 수치를 절대 노출하지 마라. " +
          "과장/단정 금지, 중복 제거, 따뜻하고 차분한 한국어를 사용하되, " +
          "그림 유형에 따라 문체 구조를 달리 구성하라. " +
          "- 집: 따뜻한 공간과 정서적 안정감 중심으로 묘사\n" +
          "- 나무: 성장과 내면 에너지 중심으로 서술\n" +
          "- 사람: 자기 표현, 자아 동일시 중심으로 서술\n" +
          "한 문단이지만 문장 길이와 어미를 다양하게 하여, 반복적 패턴처럼 들리지 않게 하라.",
      },
      {
        role: "user",
        content:
          `대상 그림 유형: ${subtype}\n` +
          `${openingRule}\n` +
          "- '인식된 요소'는 직접 명칭을 말하지 말고, '세부가 충분/간결', '핵심 요소가 생략/강조' 같은 간접 표현을 사용하라.\n" +
          "- 행동 신호(지우기/리셋/펜 굵기)는 서술 속에 부드럽게 녹여라.\n" +
          "- 사람 그림일 경우, 먼저 선택한 성별 신호가 있다면 직접적인 ‘남성/여성’ 표현 없이, 자기 동일시나 역할 인식 등으로 간접 서술하라.\n" +
          "- 임상명칭/진단 금지. 가설 어조 사용.\n\n" +
          "[해석 근거(객체명 비노출)]\n" +
          (meaningBullets || "(없음)") +
          "\n\n[추가 신호]\n" +
          (signals || "(없음)") +
          "\n\n이 재료를 바탕으로 상담자에게 전달할 한 문단 요약을 작성하라.",
      },
    ],
  });

  const text = choices?.[0]?.message?.content?.trim() || "";
  return { summary: text };
}


// ========= 2) 그림별 요약들을 모아 전체 종합 =========
async function synthesizeOverallFromDrawingSummaries(entries, opts = {}) {
  
  // 성별 문자열을 통일하는 헬퍼 추가
  function normalizeGender(gender) {
    if (!gender) return "";
    if (typeof gender !== "string") return gender;
    if (gender.includes("male")) return "male";
    if (gender.includes("female")) return "female";
    return gender.trim().toLowerCase();
  }
  
  const name = (opts.name || "").trim();

  // 성별 통일 후 비교하도록 수정
  const firstGender = normalizeGender(opts.first_gender);
  const userGender = normalizeGender(opts.gender);
  // const firstGender = opts.first_gender || null;
  // const userGender = opts.gender || null;  

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
    if (isPerson && firstGender && userGender) {
      genderNote =
        firstGender === userGender
          ? "먼저 선택한 성별이 본인과 같음 → 자기 동일시가 자연스럽게 이루어지는 일반적인 양상으로, 성별 자체를 언급하지 말고 간접적으로 표현하라."
          : "먼저 선택한 성별이 본인과 다름 → 성역할 동일시나 이성에 대한 관심을 시사하지만, ‘남성/여성’ 등의 단어를 사용하지 말고 간접적으로 표현하라.";
    }

  }

  const { choices } = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.35,
  max_tokens: 2000,   // ✅ 길이 충분히 확보 (기존 1500 → 2000)
  messages: [
    {
      role: "system",
      content:
        "너는 HTP(집-나무-사람) 검사 종합 보고서를 작성하는 전문 상담가다. " +
        "내담자가 그린 4개의 그림(집, 나무, 사람, 추가그림)을 기반으로 " +
        "성격, 정서, 대인관계, 심리적 특성을 종합적으로 해석하라. " +
        "다음 요소를 반드시 통합 반영해야 한다:\n" +
        "- 각 그림별 주요 해석 요약\n" +
        "- 먼저 그린 성별(first_gender)과 내담자 성별의 관계 해석\n" +
        "- 그림 과정에서의 펜 굵기, 지우기 횟수, 새로 그리기 횟수에 따른 성향 해석\n\n" +
        "보고서는 따뜻하고 객관적인 톤으로 작성하되, 단정이나 병리적 표현은 피한다. " +
        "객체명(창문, 문 등)을 직접 언급하지 말고, 심리적 의미를 중심으로 설명하라. " +
        "결과는 200~300자 분량의 한 문단으로 작성하라.",
    },
    {
      role: "user",
      content: `아래 그림별 종합 요약 및 행동정보를 바탕으로 전체 해석을 JSON으로 작성하라.

요구 스키마:
{
  "personalized_overall": string,  // 200~300자 내외
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
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "너는 아동 HTP 검사 보고서 편집자다. " +
          "색채 해석 문장을 자연스럽고 짧게 다듬어라. " +
          "문장은 3~5문장 이내로 요약하며, '2단계 그림에서는~'으로 시작하라. " +
          "핵심 의미만 남기고 반복·장황한 표현은 제거하라. " +
          "문체는 따뜻하고 부드럽게 유지하되 단정은 피하라.",
      },
      {
        role: "user",
        content: `아래 색채 해석 초안을 간결하고 자연스럽게 다듬어줘.
[초안]
${rawAnalysis}`,
      },
    ],
  });

  return choices?.[0]?.message?.content?.trim() || rawAnalysis;
}


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

// ✅ 모든 함수 export 통합
module.exports = {
  summarizeDrawingForCounselor,
  synthesizeOverallFromDrawingSummaries,
  refineColorAnalysis,
  generateDiagnosisSummary,
};
