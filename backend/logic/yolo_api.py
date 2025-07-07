# backend/logic/yolo_api.py

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import torch

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 타입에 따른 모델 로딩 함수
def get_model_by_type(drawing_type):
    model_map = {
        "house": "house_model.pt",
        "tree": "tree_model.pt",
        "person": "person_model.pt",
    }

    if drawing_type not in model_map:
        raise ValueError(f"Unknown drawing type: {drawing_type}")

    model_path = os.path.join(os.path.dirname(__file__), model_map[drawing_type])
    
    print(f"🔍 Loading model for: {drawing_type} → {model_path}")  # 로그 확인용

    model = torch.hub.load(
        'ultralytics/yolov5',
        'custom',
        path=model_path,
        force_reload=True
    )
    return model


# 메인 분석 엔드포인트
@app.post("/analyze/{drawing_type}")
async def analyze_drawing(drawing_type: str, image: UploadFile = File(...)):
    try:
        model = get_model_by_type(drawing_type)

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
        return {"error": str(e)}

# 개발용 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)

print("✅ Server entry point reached")
