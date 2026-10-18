"""
Local Inference API Server.

Exposes an OpenAI-compatible HTTP API backed by Ollama:

  POST /v1/chat/completions   — text and vision chat
  POST /v1/vision             — image analysis shortcut
  POST /v1/embeddings         — text embeddings
  GET  /health                — service health
  GET  /models                — model status and availability
  GET  /gpu                   — GPU VRAM metrics

Run with:
    python -m services.inference.server
    # or
    uvicorn services.inference.server:app --host 0.0.0.0 --port 8001
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.inference.config import settings
from services.inference.gpu import get_gpu_info
from services.inference.router import get_router, InferenceResponse

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Local Inference API",
    description="OpenAI-compatible local AI inference via Ollama",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas (OpenAI-compatible)
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str
    images: Optional[list[str]] = None  # base64-encoded images


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completions request."""
    model: Optional[str] = None         # ignored — router picks the model
    messages: list[ChatMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    response_format: Optional[dict] = None  # {"type": "json_object"}
    stream: bool = False

    @property
    def json_mode(self) -> bool:
        return (
            self.response_format is not None
            and self.response_format.get("type") == "json_object"
        )

    @property
    def images(self) -> list[str]:
        """Collect all images from all messages."""
        imgs: list[str] = []
        for msg in self.messages:
            if msg.images:
                imgs.extend(msg.images)
        return imgs


class VisionRequest(BaseModel):
    """Shortcut vision endpoint — single image + prompt."""
    image: str = Field(..., description="Base64-encoded image or file path")
    prompt: str = Field(..., description="Instruction for the vision model")
    system: str = ""
    json_mode: bool = False
    max_tokens: int = 1024


class EmbeddingsRequest(BaseModel):
    """OpenAI-compatible embeddings request."""
    model: Optional[str] = None
    input: str | list[str]
    encoding_format: str = "float"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_openai_chat_response(resp: InferenceResponse, request_id: str) -> dict:
    """Convert InferenceResponse to an OpenAI-compatible chat response."""
    return {
        "id": f"chatcmpl-{request_id}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": resp.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": resp.text},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": resp.prompt_tokens,
            "completion_tokens": resp.completion_tokens,
            "total_tokens": resp.total_tokens,
        },
        "_meta": {
            "latency_ms": resp.latency_ms,
            "role": resp.role,
            "success": resp.success,
        },
    }


def _to_openai_embeddings_response(resp: InferenceResponse, request_id: str) -> dict:
    """Convert InferenceResponse to an OpenAI-compatible embeddings response."""
    data = [
        {"object": "embedding", "index": i, "embedding": emb}
        for i, emb in enumerate(resp.embeddings)
    ]
    return {
        "object": "list",
        "model": resp.model,
        "data": data,
        "usage": {"prompt_tokens": len(data), "total_tokens": len(data)},
        "_meta": {"latency_ms": resp.latency_ms, "success": resp.success},
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Service health check."""
    router = get_router()
    ollama_ok = router._client.health()
    return {
        "status": "ok" if ollama_ok else "degraded",
        "ollama": ollama_ok,
        "service": "inference",
        "version": "1.0.0",
    }


@app.get("/gpu")
async def gpu_status():
    """GPU VRAM metrics."""
    gpus = get_gpu_info()
    if not gpus:
        return {"gpus": [], "available": False}
    return {
        "available": True,
        "gpus": [g.to_dict() for g in gpus],
    }


@app.get("/models")
async def models_status():
    """Model availability and VRAM status."""
    router = get_router()
    return router.status()


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completions.

    If any message contains images (base64), the vision model is used.
    Otherwise, the generation model is used.
    """
    router = get_router()

    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    images = request.images

    resp = router.chat(
        messages=messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        json_mode=request.json_mode,
        images=images if images else None,
    )

    if not resp.success:
        raise HTTPException(status_code=503, detail=resp.error)

    request_id = hex(id(request))[2:]
    return _to_openai_chat_response(resp, request_id)


@app.post("/v1/vision")
async def vision(request: VisionRequest):
    """
    Vision endpoint — analyse a single image.

    Accepts base64-encoded image data.
    Uses the vision model (Qwen3-VL-2B) with keep_alive=0 (unloads after use).
    """
    router = get_router()

    resp = router.analyze_image(
        image=request.image,
        prompt=request.prompt,
        system=request.system,
        json_mode=request.json_mode,
    )

    if not resp.success:
        raise HTTPException(status_code=503, detail=resp.error)

    return {
        "model": resp.model,
        "content": resp.text,
        "latency_ms": resp.latency_ms,
        "tokens": resp.total_tokens,
    }


@app.post("/v1/embeddings")
async def embeddings(request: EmbeddingsRequest):
    """
    OpenAI-compatible embeddings endpoint.
    """
    router = get_router()
    resp = router.embed(request.input)

    if not resp.success:
        raise HTTPException(status_code=503, detail=resp.error)

    request_id = hex(id(request))[2:]
    return _to_openai_embeddings_response(resp, request_id)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(
        "services.inference.server:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
        log_level="info",
    )
