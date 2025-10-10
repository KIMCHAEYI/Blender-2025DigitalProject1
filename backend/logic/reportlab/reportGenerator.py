# backend/logic/reportlab/reportGenerator.py
import sys, json, os
from datetime import datetime

# ReportLab
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Matplotlib (그래프 이미지 생성)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # backend/
FONT_PATH = os.path.join(BASE_DIR, "fonts", "NanumGothic.ttf")
if os.path.exists(FONT_PATH):
    pdfmetrics.registerFont(TTFont("Korean", FONT_PATH))
    FONT_NAME = "Korean"
else:
    FONT_NAME = "Helvetica"  # 폰트 없으면 영문으로 대체

def mm_from_top(y_mm):
    page_w, page_h = A4
    return page_h - y_mm * mm

def draw_title(c, text, y_mm):
    c.setFont(FONT_NAME, 18)
    c.drawString(20 * mm, mm_from_top(y_mm), text)

def draw_text(c, text, y_mm, size=12):
    c.setFont(FONT_NAME, size)
    c.drawString(20 * mm, mm_from_top(y_mm), text)

def seconds_to_mmss(sec):
    try:
        sec = int(sec)
    except:
        sec = 0
    m = sec // 60
    s = sec % 60
    return f"{m}분 {s}초" if m else f"{s}초"

def save_bar_chart(data_dict, title, out_path):
    labels = list(data_dict.keys())
    values = list(data_dict.values())
    plt.figure(figsize=(5, 3))
    plt.bar(labels, values)
    plt.title(title)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()

def save_hbar_chart(data_dict, title, out_path):
    labels = list(data_dict.keys())
    values = list(data_dict.values())
    plt.figure(figsize=(5, 3))
    plt.barh(labels, values)
    plt.title(title)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()

def build_pdf(payload, out_pdf):
    """
    payload 예시:
    {
        "session_id": "1760...",
        "user": {"name":"김채이","gender":"여","birth":"2017-03-01"},
        "created_at": "2025-10-10T12:34:56Z",
        "diagnosis": "...",
        "overall_summary": "...",
        "drawings": [
        {"type":"house","duration":180,"image":"/uploads/...png","analysis":[{"label":"창문", "meaning":"..."}]},
        ...
        ]
    }
    """
    os.makedirs(os.path.dirname(out_pdf), exist_ok=True)
    c = canvas.Canvas(out_pdf, pagesize=A4)

    # ===== 표지 =====
    draw_title(c, "HTP 심리검사 보고서", 28)
    draw_text(c, f"세션 ID: {payload.get('session_id','-')}", 42)
    user = payload.get("user", {})
    draw_text(c, f"이름: {user.get('name','-')}", 50)
    draw_text(c, f"성별: {user.get('gender','-')}", 58)
    created = payload.get("created_at") or datetime.now().isoformat()
    draw_text(c, f"검사일: {created[:10]}", 66)
    c.showPage()

    # ===== 소요시간 요약 + 그래프 =====
    dlist = payload.get("drawings", [])
    durations = {}
    for d in dlist:
        t = d.get("type", "unknown")
        durations[t] = durations.get(t, 0) + int(d.get("duration", 0))

    draw_title(c, "그리기 소요시간", 28)
    y = 44
    total = sum(durations.values())
    for t, sec in durations.items():
        draw_text(c, f"• {t}: {seconds_to_mmss(sec)}", y); y += 8
    draw_text(c, f"총 소요시간: {seconds_to_mmss(total)}", y + 2)

    tmp_dir = os.path.join(os.path.dirname(out_pdf), "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    dur_chart = os.path.join(tmp_dir, "durations.png")
    save_bar_chart(durations, "소요시간(초)", dur_chart)
    c.drawImage(dur_chart, 20*mm, 30*mm, width=170*mm, height=80*mm, preserveAspectRatio=True, mask='auto')
    c.showPage()

    # ===== 객체 인식 수 그래프 =====
    label_counts = {}
    for d in dlist:
        analysis = d.get("analysis") or []
        # analysis가 객체형일 수도 있으므로 방어
        if not isinstance(analysis, list) and isinstance(analysis, dict) and isinstance(analysis.get("analysis"), list):
            analysis = analysis["analysis"]
        if not isinstance(analysis, list):
            analysis = []
        for a in analysis:
            lbl = a.get("label")
            if not isinstance(lbl, str):
                continue
            key = lbl.replace("(미표현)", "").strip()
            label_counts[key] = label_counts.get(key, 0) + 1

    draw_title(c, "객체 인식 수(상위 10)", 28)
    top10 = dict(sorted(label_counts.items(), key=lambda x: x[1], reverse=True)[:10])
    obj_chart = os.path.join(tmp_dir, "objects.png")
    save_hbar_chart(top10, "객체 인식 수", obj_chart)
    c.drawImage(obj_chart, 20*mm, 30*mm, width=170*mm, height=100*mm, preserveAspectRatio=True, mask='auto')
    c.showPage()

    # ===== 종합 해석/진단 =====
    draw_title(c, "종합 해석", 28)
    draw_text(c, payload.get("overall_summary", "(해석 요약 없음)"), 44)
    draw_title(c, "진단 내용", 70)
    draw_text(c, payload.get("diagnosis", "(진단 내용 없음)"), 86)

    c.save()

def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)
    out_pdf = payload.get("_out_pdf")
    if not out_pdf:
        sys.stderr.write("out pdf path missing\n")
        sys.exit(2)
    build_pdf(payload, out_pdf)
    print(out_pdf)

if __name__ == "__main__":
    main()
