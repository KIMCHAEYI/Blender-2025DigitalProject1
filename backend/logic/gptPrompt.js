require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { analyzeEmotion, analyzeObjects } = require("./analyzeResult");

async function interpretMultipleDrawings(drawings) {
  const drawingDetails = drawings.map((d) => {
    const emotionScores = analyzeEmotion(d.checkedItems);
    const objectInterpretations = analyzeObjects(d.detectedObjects, d.type); // ✅ 타입 기준 분기
    return {
      type: d.type,
      json: d.json,
      emotionScores,
      objectInterpretations,
    };
  });

  const promptParts = drawingDetails.map((d) => {
    return `
  [그림 종류]: ${d.type}
  [객체 분석 JSON]:
  ${JSON.stringify(d.json, null, 2)}

  [감정 점수]:
  ${Object.entries(d.emotionScores)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")}
  `;
  });

  const fullPrompt = `
  다음은 총 4개의 HTP 그림 분석 결과입니다. 각 그림별로 '객체 분석'과 '감정 점수'가 주어집니다.
  아래 정보를 바탕으로:

  1. 각 그림에 대한 심리 해석을 제공해 주세요.
  2. 전체 종합 해석을 추가해 주세요. (성격 요약, 불안 요소, 대인관계 특성, 정서 상태, 조언 등)

  결과는 다음 구조의 JSON으로 작성해 주세요:

  {
    "per_drawing": {
      "house": "...",
      "tree": "...",
      "person_woman": "...",
      "person_man": "..."
    },
    "overall_summary": {
      "summary": "...",
      "traits": ["..."],
      "psychological_notes": "...",
      "suggestion": "..."
    }
  }

  [아래는 그림별 분석 정보입니다]
  ${promptParts.join("\n========================\n")}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: fullPrompt }],
    temperature: 0.7,
  });

  const text = completion.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("GPT 응답을 JSON으로 파싱할 수 없음:\n" + text);
  }

  // ✅ 각 그림 해석에 objects 병합
  for (const d of drawingDetails) {
    const key = d.type; // 예: house, tree, person_woman, person_man
    const summary = parsed.per_drawing[key];

    parsed.per_drawing[key] = {
      summary, // GPT의 해석 요약
      objects: d.objectInterpretations, // 우리가 평가표 기반으로 만든 해석
    };
  }

  return parsed;
}

module.exports = { interpretMultipleDrawings };
