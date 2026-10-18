from paddleocr import PPStructure
import cv2

engine = PPStructure(show_log=True)
img = cv2.imread('test_image.jpg') # I need an image... 
# But wait, I just want to see the output format. I can just create a dummy numpy array.
import numpy as np
img = np.zeros((1000, 1000, 3), dtype=np.uint8)
res = engine(img)
print(res)
