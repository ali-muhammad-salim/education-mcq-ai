import asyncio
import os
import sys

# Ensure root path is in sys.path
sys.path.insert(0, os.path.abspath('.'))

import logging
logger = logging.getLogger(__name__)
import importlib

# Dynamically add cuDNN and CUDA bin to PATH on Windows so Paddle C++ backend finds them
if os.name == "nt":
    packages = ["nvidia.cudnn", "nvidia.cublas", "nvidia.cuda_nvrtc", "nvidia.cuda_runtime"]
    paths = []
    for pkg in packages:
        try:
            m = importlib.import_module(pkg)
            bin_dir = os.path.join(os.path.dirname(m.__file__), "bin")
            if os.path.exists(bin_dir):
                paths.append(bin_dir)
        except ImportError:
            pass
    if paths:
        os.environ["PATH"] = ";".join(paths) + ";" + os.environ["PATH"]
        logger.info(f"Added NVIDIA DLL directories to PATH: {paths}")

from services.ingestion.pipeline import IngestionPipeline

async def main():
    db = None
    pipeline = IngestionPipeline(db)
    
    file_path = "data/downloads/Mathematics-Science-IX-Model-Paper-I-2026.pdf"
    
    metadata = {
        "source_url": "test",
        "doc_type": "syllabus",
        "board": "AKU-EB"
    }
    
    print("Starting ingestion...")
    try:
        doc = pipeline.run(file_path, doc_type="PAST_PAPER", metadata=metadata, force=True)
        print("Success:", doc)
    except Exception as e:
        print("Error:", e)
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    asyncio.run(main())
