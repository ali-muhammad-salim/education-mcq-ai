from paddleocr import PaddleOCR
import numpy as np

img_array = np.zeros((100, 100, 3), dtype=np.uint8)
ocr = PaddleOCR(lang='en', use_angle_cls=True)
try:
    result = ocr.ocr(img_array, det=False, rec=False)
    print("OCR worked with det=False, rec=False")
except Exception as e:
    print("OCR error with det=False, rec=False:", e)

try:
    # how about we just call ocr.ocr(img_array)
    result = ocr.ocr(img_array)
    print("OCR worked with default")
except Exception as e:
    print("OCR error with default:", e)
