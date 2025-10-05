import axios from "axios";

const API_BASE = "http://172.30.1.87:5000";

/** 절대/상대 URL 합성 */
export const toAbsUrl = (path) => {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;
  return `${API_BASE}${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
};

/** PDF HTML 빌드 */
export const buildPdfHtml = ({
  version = "summary",
  safeUser,
  TYPES,
  drawingsNormalized,
  uniqByLabelMeaning,
  TITLE,
  formatDuration,
  totalDuration,
}) => {
  const head = `
    <meta charset='UTF-8'/>
    <meta name='viewport' content='width=device-width, initial-scale=1'/>
    <style>
      body{font-family:sans-serif;padding:24px;color:#1c1c1e}
      h1{font-size:22px;margin:0 0 12px}
      h2{font-size:18px;margin:24px 0 8px}
      img{width:100%;max-height:280px;object-fit:contain;border:1px solid #eee;border-radius:8px}
      ul{padding-left:18px} li{margin-bottom:6px}
      .muted{color:#666} .sub{color:#555;font-size:14px}
    </style>`;

  const secHtml = TYPES.map((t, idx) => {
    const sec = drawingsNormalized?.[t] || {};
    const items = uniqByLabelMeaning(sec.analysis || []);
    const img = toAbsUrl(sec.image);
    const yolo = toAbsUrl(sec?.yolo?.image);

    return `
      <section>
        <h2>${idx + 1}. ${TITLE[t] ?? t} 그림</h2>
        <p class="sub">객체 인식 ${items.length}개${
      sec.duration ? ` · ${formatDuration(sec.duration)}` : ""
    }</p>
        ${
          img
            ? `<img src='${img}' alt='원본'/>`
            : `<p class='muted'>원본 이미지 없음</p>`
        }
        ${
          yolo
            ? `<img src='${yolo}' alt='분석'/>`
            : `<p class='muted'>분석 이미지 없음</p>`
        }
        ${sec.counselor_summary || "(상담가 요약 없음)"}
        ${
          version === "full"
            ? items.length
              ? `<ul>${items
                  .map(
                    (o) => `<li>✅ <b>${o.label}</b> ${o.meaning ?? ""}</li>`
                  )
                  .join("")}</ul>`
              : `<p class="muted">분석 항목 없음</p>`
            : ""
        }
      </section>`;
  }).join("");

  const summary = `
    <section>
      <h2>🩺 진단 내용</h2>
      <p>${safeUser?.diagnosis || "(진단 내용 준비 중)"}</p>
    </section>
    <section>
      <h2>📝 종합 해석</h2>
      <p>총 소요시간: ${
        totalDuration ? formatDuration(totalDuration) : "N/A"
      }</p>
      <p>${safeUser?.overall_summary || "(해석 요약 준비 중)"}</p>
    </section>`;

  return `<!doctype html><html lang='ko'><head><title>HTP 검사 결과</title>${head}</head>
    <body>
      <h1>HTP 검사 결과 (${version === "summary" ? "요약" : "상세"})</h1>
      ${summary}${secHtml}
    </body></html>`;
};

/** PDF 다운로드 */
export const downloadPdf = async ({
  version = "summary",
  safeUser,
  TYPES,
  drawingsNormalized,
  uniqByLabelMeaning,
  TITLE,
  formatDuration,
  totalDuration,
  setDownloading,
}) => {
  try {
    setDownloading?.(true);
    const fn = `HTP_${safeUser.name || "-"}_${version}`;
    const html = buildPdfHtml({
      version,
      safeUser,
      TYPES,
      drawingsNormalized,
      uniqByLabelMeaning,
      TITLE,
      formatDuration,
      totalDuration,
    });

    const res = await axios.post(`${API_BASE}/api/sessions/generate-pdf`, {
      html,
      filename: fn,
    });

    const url = toAbsUrl(res?.data?.path);
    if (url) window.open(url, "_blank");
  } finally {
    setDownloading?.(false);
  }
};
