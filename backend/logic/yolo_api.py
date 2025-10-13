# backend/logic/yolo_api.py

import time, logging, os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from backend.results_yolo.save_bbox import save_bbox_image # 수진
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

MODELS = {} 

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
    path = _model_path(drawing_type)
    log.info(f"[YOLO] loading {drawing_type} from {path}")
    model = torch.hub.load(
        'ultralytics/yolov5',
        'custom',
        path=path,
        force_reload=False 
    )
    return model

def _warmup_model(model):
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    _ = model(dummy)

@app.on_event("startup")
def _startup():
    t0 = time.time()
    torch.set_num_threads(max(1, os.cpu_count() // 2))  
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
    results = model(img_bgr)
    boxes = results.pandas().xyxy[0] 
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
    import base64

    t0 = time.time()
    if drawing_type not in MODELS:
        return {"error": f"Unknown drawing type: {drawing_type}"}

    # 1️⃣ 이미지 읽기
    data = await image.read()
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "Invalid image data."}

    # 2️⃣ YOLO 추론 (스레드풀로 실행)
    model = MODELS[drawing_type]
    results = await run_in_threadpool(model, img)
    objects = await run_in_threadpool(_infer_sync, model, img)

    # 3️⃣ YOLO bbox 시각화 이미지 저장 (base64 대신 파일로 저장)
    from backend.results_yolo.save_bbox import save_bbox_image

    rendered = results.render()[0]  # YOLO가 그린 bbox 이미지 (numpy BGR)
    bbox_url = save_bbox_image(rendered, drawing_type)


    # 4️⃣ 로그 및 응답
    log.info(f"POST /analyze/{drawing_type} -> {len(objects)} objs in {time.time()-t0:.2f}s")
    return {
        "type": drawing_type,
        "objects": objects,
        "bbox_url": bbox_url
    }
