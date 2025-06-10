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

@app.post("/analyze/{drawing_type}")
async def analyze_drawing(drawing_type: str, image: UploadFile = File(...)):
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        results = model(img)
        boxes = results.pandas().xyxy[0]

        objects = []
        for _, row in boxes.iterrows():
            objects.append({
                "label": row["name"],
                "confidence": float(row["confidence"]),
                "x": int(row["xmin"]),
                "y": int(row["ymin"]),
                "w": int(row["xmax"] - row["xmin"]),
                "h": int(row["ymax"] - row["ymin"]),
            })

        return {
            "type": drawing_type,
            "objects": objects
        }

    except Exception as e:
        return {"error": str(e)}  # 항상 JSON 응답 유지


@app.post("/analyze/tree")
async def analyze_tree(file: UploadFile = File(...)):
    # 파일 저장 및 YOLO 분석 처리
    return {"result": "tree 분석 결과"}

@app.post("/analyze/person")
async def analyze_person(file: UploadFile = File(...)):
    # 파일 저장 및 YOLO 분석 처리
    return {"result": "person 분석 결과"}

@app.post("/detect")
async def detect_objects(image: UploadFile = File(...)):
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    print("👀 요청 들어옴")

    results = model(img)
    response = []

    # YOLOv5 모델은 기본적으로 results[0] 이 아닌 Detections 객체 하나를 반환합니다.
    boxes = results.pandas().xyxy[0]  # 판다스로 추출

    for _, row in boxes.iterrows():
        label = row['name']
        x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
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
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)

print("✅ Server entry point reached")
