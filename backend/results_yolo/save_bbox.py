from pathlib import Path
import cv2, time

BACKEND_DIR = Path(__file__).resolve().parents[1]
OUT_ROOT = BACKEND_DIR / "uploads" / "yolo_bbox"

def save_bbox_image(image, category="common"):
    out_dir = OUT_ROOT / category
    out_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{time.strftime('%Y%m%d_%H%M%S')}_bbox.jpg"
    out_path = out_dir / filename
    cv2.imwrite(str(out_path), image)

    return f"/uploads/yolo_bbox/{category}/{filename}"
