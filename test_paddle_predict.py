from paddleocr import PPStructureV3, PaddleOCR
import numpy as np

# create a dummy image
img_array = np.zeros((100, 100, 3), dtype=np.uint8)

engine = PPStructureV3(use_region_detection=True, lang='en')
results = engine.predict(img_array)
print("PPStructureV3 predict results type:", type(results))
if isinstance(results, list):
    print("PPStructureV3 predict results len:", len(results))
    for res in results:
        print("Item type:", type(res))
elif hasattr(results, '__next__'):
    print("It's a generator")
    for res in results:
        print("Item type:", type(res))
else:
    print("It's something else.")

ocr = PaddleOCR(lang='en', use_angle_cls=False)
result = ocr.ocr(img_array)
print("PaddleOCR result type:", type(result))
if result is None:
    print("PaddleOCR result is None")
elif isinstance(result, list):
    print("PaddleOCR result len:", len(result))
    if len(result) > 0:
        print("First item:", result[0])
