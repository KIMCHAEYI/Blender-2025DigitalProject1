# yolo_api.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
import numpy as np
from io import BytesIO
import os
import torch


app = FastAPI()

# CORS 설정 (필요 시)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드
base_dir = os.path.dirname(__file__)  # backend/logic/
model_path = os.path.join(os.path.dirname(__file__), "house_model.pt")
model = torch.hub.load(
    'ultralytics/yolov5',
    'custom',
    path=model_path,
    force_reload=True
)

@app.post("/detect")
async def detect_objects(image: UploadFile = File(...)):
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(img)[0]  # ✅ 수정된 코드
    response = []

    for box in results.boxes:
        label = model.names[int(box.cls[0])]
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        w = x2 - x1
        h = y2 - y1
        response.append({
            "label": label,
            "x": x1,
            "y": y1,
            "w": w,
            "h": h
        })

    return response 

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("logic.yolo_api:app", host="127.0.0.1", port=8000, reload=True)
