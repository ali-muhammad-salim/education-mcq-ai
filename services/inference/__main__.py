"""Run the inference server with: python -m services.inference"""

from services.inference.server import app
import uvicorn
from services.inference.config import settings
import logging

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="info",
    )
