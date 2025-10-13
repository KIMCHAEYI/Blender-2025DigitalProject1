import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

export const toAbsUrl = (path) => {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || /^data:|^blob:/i.test(path)) return path;
  return `${API_BASE}${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
};

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
  const now = new Date().toLocaleString("ko-KR");

  const head = `
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width, initial-scale=1'/>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

    @page {
      margin: 60px 48px 60px 48px;
      @top-center {
        content: "생성일: ${now}";
        font-family: 'Pretendard', sans-serif;
        font-size: 12px;
        color: #555;
      }
      @bottom-center {
        content: counter(page) " / " counter(pages);
        font-family: 'Pretendard', sans-serif;
        font-size: 12px;
        color: #777;
      }
    }

    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      color: #1c1c1e;
      line-height: 1.6;
      background: #fff;
      padding: 40px 48px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      page-break-before: avoid;
    }

    h2 {
      font-size: 20px;
      margin: 28px 0 12px;
      font-weight: 600;
      page-break-after: avoid;
    }

    p {
      font-size: 15px;
      margin: 6px 0;
    }

    /* ✅ 이미지 행 수정: 페이지 잘림 방지 */
    .image-row {
      display: block;
      margin: 12px 0 18px;
      page-break-inside: avoid;
    }

    .image-pair {
      width: 100%;
      display: table;
      table-layout: fixed;
    }

    .image-cell {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      text-align: center;
      padding: 0 6px;
    }

    .image-cell img {
      width: 100%;
      max-height: 260px;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    ul {
      padding-left: 20px;
      margin-top: 8px;
      page-break-inside: avoid;
    }

    li {
      margin-bottom: 4px;
    }

    .muted { color: #666; }
    .sub { color: #555; font-size: 14px; }

    .section {
      margin-bottom: 48px;
      page-break-inside: avoid;
      width: 100%;
    }

    .summary-block {
      background: #f7f7f8;
      border: 1px solid #ececec;
      padding: 20px 24px;
      border-radius: 14px;
      margin-bottom: 28px;
      page-break-inside: avoid;
    }

    .info-table {
      border-collapse: collapse;
      margin-bottom: 36px;
      width: 100%;
      page-break-inside: avoid;
    }

    .info-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      font-size: 15px;
    }

    .info-table td.label {
      width: 120px;
      font-weight: 600;
      color: #333;
    }

    footer {
      text-align: center;
      font-size: 13px;
      color: #777;
      margin-top: 40px;
      page-break-before: avoid;
    }
  </style>`;

  const infoHtml = `
    <table class="info-table">
      <tr><td class="label">이름</td><td>${safeUser.name || "-"}</td></tr>
      <tr><td class="label">성별</td><td>${safeUser.gender || "-"}</td></tr>
      <tr><td class="label">생년월일</td><td>${safeUser.birth || "-"}</td></tr>
      <tr><td class="label">검사일</td><td>${
        safeUser.created_at
          ? new Date(safeUser.created_at).toLocaleDateString("ko-KR")
          : new Date().toLocaleDateString("ko-KR")
      }</td></tr>
    </table>
  `;

  const secHtml = TYPES.map((t, idx) => {
    const sec = drawingsNormalized?.[t] || {};
    const items = uniqByLabelMeaning(sec.analysis || []);
    const img = toAbsUrl(sec.image);
    const yolo = toAbsUrl(sec?.yolo?.image);

    return `
      <section class="section">
        <h2>${idx + 1}. ${TITLE[t] ?? t} 그림</h2>
        <p class="sub">객체 인식 ${items.length}개${
      sec.duration ? ` · ${formatDuration(sec.duration)}` : ""
    }</p>

        <div class="image-row">
          <div class="image-pair">
            ${
              img
                ? `<div class="image-cell"><img src='${img}' alt='원본 이미지'/><p class="sub">원본</p></div>`
                : `<p class='muted'>원본 없음</p>`
            }
            ${
              yolo
                ? `<div class="image-cell"><img src='${yolo}' alt='분석 이미지'/><p class="sub">분석</p></div>`
                : `<p class='muted'>분석 이미지 없음</p>`
            }
          </div>
        </div>

        <div class="sub">${sec.counselor_summary || "(상담가 요약 없음)"}</div>

        ${
          version === "full"
            ? items.length
              ? `<ul>${items
                  .map((o) => `<li>${o.meaning ? o.meaning : ""}</li>`)
                  .join("")}</ul>`
              : `<p class="muted">분석 항목 없음</p>`
            : ""
        }
      </section>`;
  }).join("");

  const summary = `
    <section class="summary-block">
      <h2>🩺 진단 내용</h2>
      <p>${
        safeUser.summary_overall?.diagnosis_summary ||
        "(진단 내용 준비 중입니다)"
      }</p>
    </section>
    <section class="summary-block">
      <h2>📝 종합 해석</h2>
      <p>총 소요시간: ${
        totalDuration ? formatDuration(totalDuration) : "N/A"
      }</p>
      <p>${
        safeUser.summary_overall?.overall_summary || "(해석 요약 준비 중입니다)"
      }</p>
    </section>`;

  return `<!doctype html>
  <html lang='ko'>
  <head>
    <title>HTP 검사 결과</title>
    ${head}
  </head>
  <body>
    <h1>HTP 검사 결과 (${version === "summary" ? "요약" : "상세"})</h1>
    ${infoHtml}
    ${summary}
    ${secHtml}
    <footer>© 2025 HTP Analysis System · 자동 생성 보고서</footer>
  </body>
  </html>`;
};

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
  } catch (err) {
    console.error("❌ PDF 생성 실패:", err);
    alert("PDF 생성에 실패했습니다.");
  } finally {
    setDownloading?.(false);
  }
};
