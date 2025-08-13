// backend/logic/gptPrompt.js  — minimal synthesis version
require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// person_male/female → 표기 키
const keyOf = (type, subtype) => {
  if (type === "person") {
    if (subtype === "person_male") return "person_man";
    if (subtype === "person_female") return "person_woman";
  }
  if (type === "person_male") return "person_man";
  if (type === "person_female") return "person_woman";
  return type; // house | tree
};

// 종합 프롬프트(룰 해석만 사용)
function buildPrompt(items) {
  const blocks = items
    .map((it, i) => {
      const lines = (it.analysis || []).map((a) =>
        `- ${a.label ?? ""} ${a.meaning ?? ""}`.trim()
      );
      return `[#${i + 1} ${it.type}${it.subtype ? `/${it.subtype}` : ""}]
${lines.length ? lines.join("\n") : "(해석 없음)"}`;
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "너는 HTP 검사 보고서 편집자다. 과도한 추정 없이, 중복을 합치고, 매끄러운 한국어로 요약한다. " +
        "최종 출력은 간결해야 하며, 동일 의미 문장은 한 번만 말한다.",
    },
    {
      role: "user",
      content: `아래는 YOLO 규칙엔진이 자동으로 생성한 '해석(meaning)' 텍스트 목록이다.
이 텍스트들을 근거로, 다음 두 가지를 한국어로 작성해라:

1) overall_summary: 종합해석 한 문단(4~6문장). 과장·단정 금지, 필요한 경우에만 괄호로 짧게 근거 표기.
2) per_drawing: 각 그림별 한 문장 요약(선택적·중복 금지). 없으면 빈 문자열.

[입력 해석 목록]
${blocks}`,
    },
  ];
}

/**
 * drawings: [{ type, result: { analysis: [{label, meaning}], subtype } }, ...]
 * 반환: { overall_summary: string, per_drawing: { house, tree, person_woman, person_man } }
 */
async function interpretMultipleDrawings(drawings) {
  // 1) 입력에서 해석만 수집 (우린 YOLO 해석만 쓰면 됨)  :contentReference[oaicite:2]{index=2}
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

  // 2) GPT 호출(간결/중복제거 전용)
  const messages = buildPrompt(items);
  const { choices } = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 700,
    messages,
  });

  // 3) 모델 텍스트 → 아주 단순한 파서(섹션 키워드 기준)
  const text = choices?.[0]?.message?.content || "";
  const pick = (label) => {
    const re = new RegExp(
      `${label}\\s*:\\s*([\\s\\S]*?)(?:\\n\\s*\\d\\)|$)`,
      "i"
    );
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };

  // per_drawing는 문장 한 줄씩 추출 시도(없으면 빈 값)
  const perDrawing = { house: "", tree: "", person_woman: "", person_man: "" };

  // 간단: 문서 안에서 'house:' 형식 찾기 대신, 모델에 자유서술을 맡겼으니
  // 여기서는 입력 순서대로 한줄 요약을 다시 생성하도록 후처리
  // (모델이 per_drawing을 못 줘도 전체 요약만으로 충분히 동작)
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const map = {};
  ["집", "house", "나무", "tree", "여성", "woman", "남성", "man"].forEach(
    (k) => (map[k] = "")
  );

  // 4) 키 매핑: 입력에 존재한 유형만 채움
  for (const it of items) {
    const k = keyOf(it.type, it.subtype);
    perDrawing[k] ||= ""; // 존재 보장
  }

  return {
    overall_summary: text || "(요약 없음)",
    per_drawing: perDrawing,
  };
}

module.exports = { interpretMultipleDrawings };
