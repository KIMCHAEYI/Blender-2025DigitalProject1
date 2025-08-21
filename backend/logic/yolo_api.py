# backend/logic/yolo_api.py

import time, logging, os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import numpy as np
import cv2
import torch

app = FastAPI()
log = logging.getLogger("uvicorn.access")

# CORS (프론트에서 요청 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 전역 모델 캐시: 서버가 켜질 때 한 번만 로딩해두고 재사용
MODELS = {}  # 예: {"house": model_obj, "tree": model_obj, "person": model_obj}

# 타입별 가중치 파일 이름
MODEL_MAP = {
    "house": "house_model.pt",
    "tree": "tree_model.pt",
    "person": "person_model.pt",
}

def _model_path(drawing_type: str) -> str:
    if drawing_type not in MODEL_MAP:
        raise ValueError(f"Unknown drawing type: {drawing_type}")
    return os.path.join(os.path.dirname(__file__), MODEL_MAP[drawing_type])

def _load_single_model(drawing_type: str):
    """
    단일 타입 모델을 로딩. torch.hub.load 사용 시 force_reload=False 로 둡니다.
    (매번 재로딩하면 느리므로 절대 True로 두지 마세요.)
    """
    path = _model_path(drawing_type)
    log.info(f"[YOLO] loading {drawing_type} from {path}")
    # yolov5 custom 가중치 로딩
    model = torch.hub.load(
        'ultralytics/yolov5',
        'custom',
        path=path,
        force_reload=False  # ❗중요: 재로딩 금지
    )
    return model

def _warmup_model(model):
    """간단한 더미 이미지를 넣어 첫 추론 지연을 없앱니다."""
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    _ = model(dummy)

@app.on_event("startup")
def _startup():
    """
    ✅ 서버 시작 시점에 3개 모델을 모두 로딩하고 워밍업까지 해둡니다.
    이렇게 하면 첫 요청이 빨라지고, 동시 요청도 안정적입니다.
    """
    t0 = time.time()
    torch.set_num_threads(max(1, os.cpu_count() // 2))  # 선택: 과도한 스레드 사용 방지
    for kind in MODEL_MAP.keys():
        m = _load_single_model(kind)
        _warmup_model(m)
        MODELS[kind] = m
        log.info(f"[YOLO] {kind} model ready.")
    log.info(f"[YOLO] startup done in {time.time()-t0:.2f}s")

@app.get("/health")
def health():
    return {"ok": True, "loaded": list(MODELS.keys())}

def _infer_sync(model, img_bgr):
    """동기 함수: OpenCV BGR 이미지를 입력받아 감지 결과를 파싱."""
    results = model(img_bgr)
    boxes = results.pandas().xyxy[0]  # yolov5 포맷
    objects = []
    for _, row in boxes.iterrows():
        objects.append({
            "label": row.get("name"),
            "confidence": float(row.get("confidence", 0.0)),
            "x": int(row.get("xmin", 0)),
            "y": int(row.get("ymin", 0)),
            "w": int(row.get("xmax", 0) - row.get("xmin", 0)),
            "h": int(row.get("ymax", 0) - row.get("ymin", 0)),
        })
    return objects

@app.post("/analyze/{drawing_type}")
async def analyze_drawing(drawing_type: str, image: UploadFile = File(...)):
    """
    ✅ 요청이 올 때는,
    1) 업로드 이미지를 메모리에서 바로 디코드하고
    2) 무거운 추론만 스레드풀에서 돌립니다(run_in_threadpool)
    -> 이벤트 루프가 막히지 않아 동시 요청에도 안정적입니다.
    """
    t0 = time.time()
    if drawing_type not in MODELS:
        return {"error": f"Unknown drawing type: {drawing_type}"}

    # 1) 이미지 바이트 읽기
    data = await image.read()
    # 2) 바이트 -> numpy 배열 -> OpenCV BGR 이미지
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "Invalid image data."}

    # 3) 추론(무겁기 때문에 스레드풀 사용)
    model = MODELS[drawing_type]
    objects = await run_in_threadpool(_infer_sync, model, img)

    # 로그: 총 처리 시간
    log.info(f"POST /analyze/{drawing_type} -> {len(objects)} objs in {time.time()-t0:.2f}s")
    return {"type": drawing_type, "objects": objects}

# ❌ 주의: __main__에서 uvicorn.run(...)을 하지 않습니다.
# CLI로: uvicorn logic.yolo_api:app --host 127.0.0.1 --port 8000
