import os
import sys
import logging
import importlib

if os.name == "nt":
    packages = ["nvidia.cudnn", "nvidia.cublas", "nvidia.cuda_nvrtc", "nvidia.cuda_runtime"]
    for pkg in packages:
        try:
            m = importlib.import_module(pkg)
            bin_dir = os.path.join(os.path.dirname(m.__file__), "bin")
            if os.path.exists(bin_dir):
                os.add_dll_directory(bin_dir)
                print(f"Added DLL directory: {bin_dir}")
        except Exception:
            pass
    sys.stdout.flush()

from paddleocr import PPStructureV3, PaddleOCR
import numpy as np

print("PPStructureV3 available:", PPStructureV3 is not None)
print("PaddleOCR available:", PaddleOCR is not None)

# try:
#     engine = PPStructureV3(use_region_detection=True, lang='en')
#     print("Engine created.")
#     print("Is engine callable?", callable(engine))
#     print("Does engine have predict?", hasattr(engine, 'predict'))
# except Exception as e:
#     print("PPStructure err:", e)

try:
    print("Testing OCR with use_gpu=True, enable_mkldnn=False")
    ocr = PaddleOCR(lang='en', use_angle_cls=False, use_gpu=True, enable_mkldnn=False, use_tensorrt=False)
    print("OCR created.")
    print("Is ocr callable?", callable(ocr))
    print("Does ocr have ocr?", hasattr(ocr, 'ocr'))
    print("Does ocr have predict?", hasattr(ocr, 'predict'))
except Exception as e:
    print("OCR err:", e)

