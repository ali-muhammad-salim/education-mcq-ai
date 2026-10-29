"""
Stage 3 – Orientation Detection and Correction.

Uses PaddleOCR's built-in angle classifier to detect page rotation and
returns both the correction angle and the corrected PIL Image.

Only 0°, 90°, 180°, 270° rotations are corrected (typical scan artefacts).
"""

from __future__ import annotations

import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_ANGLE_MAP: dict[int, int] = {
    0: 0,
    1: 90,   # rotated 90° CW → correct by 90° CCW
    2: 180,
    3: 270,
}


def detect_and_correct_orientation(
    pil_image: Image.Image,
    use_gpu: bool = False,
) -> tuple[Image.Image, float]:
    """
    Detect the dominant text orientation and return a corrected image.

    Parameters
    ----------
    pil_image:
        The rendered page image.
    use_gpu:
        Whether to use GPU for PaddleOCR's classifier.

    Returns
    -------
    (corrected_image, correction_angle_degrees)
    """
    try:
        from paddleocr import PaddleOCR
    except ImportError:
        logger.warning("PaddleOCR not installed; skipping orientation detection.")
        return pil_image, 0.0

    global _GLOBAL_ORIENTATION_OCR
    if '_GLOBAL_ORIENTATION_OCR' not in globals() or _GLOBAL_ORIENTATION_OCR is None:
        try:
            _GLOBAL_ORIENTATION_OCR = PaddleOCR(
                use_angle_cls=True,
                lang="en",
            )
        except Exception as exc:
            logger.error("PaddleOCR Initialization failed: %s", exc)
            return pil_image, 0.0

    try:
        ocr = _GLOBAL_ORIENTATION_OCR

        img_array = np.array(pil_image)
        result = ocr.ocr(img_array)

        # result structure: [[[text, (angle_label, score)], ...]]
        if not result or not result[0]:
            return pil_image, 0.0

        cls_result = result[0][0]
        if not cls_result:
            return pil_image, 0.0

        # cls_result: (angle_label_str, score)  e.g. ("180", 0.97)
        angle_str = cls_result[0] if isinstance(cls_result[0], str) else "0"
        angle = int(angle_str)

        if angle == 0:
            return pil_image, 0.0

        # PIL rotate: positive degrees = counter-clockwise
        corrected = pil_image.rotate(angle, expand=True)
        logger.debug("Corrected page orientation by %d°", angle)
        return corrected, float(angle)

    except Exception as exc:
        logger.warning("Orientation detection failed: %s", exc)
        return pil_image, 0.0
