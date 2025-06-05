# backend/logic/yolo_api.py

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import torch
import io

app = FastAPI()

# 모델 로딩 (YOLOv5)
model = torch.hub.load(
    'ultralytics/yolov5', 
    'custom', 
    path='E:/Blender-2025DigitalProject1/backend/logic/house_model.pt',
    force_reload=True
)

@app.post("/analyze/house")
async def analyze_house_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 추론 실행
        results = model(image)

        detections = []
        for det in results.xyxy[0]:
            x1, y1, x2, y2, conf, cls = det.tolist()
            label = model.names[int(cls)]
            w, h = x2 - x1, y2 - y1
            cx, cy = x1 + w / 2, y1 + h / 2
            area = w * h
            image_area = image.width * image.height
            area_ratio = area / image_area

            # 위치 영역 분류
            x_zone = "left" if cx < image.width / 3 else "right" if cx > image.width * 2 / 3 else "center"
            y_zone = "top" if cy < image.height / 3 else "bottom" if cy > image.height * 2 / 3 else "middle"
            position = f"{x_zone}-{y_zone}"

            detections.append({
                "label": label,
                "bbox": [x1, y1, x2, y2],
                "confidence": round(conf, 3),
                "area_ratio": round(area_ratio, 4),
                "position": position
            })

        return JSONResponse(content=detections)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
