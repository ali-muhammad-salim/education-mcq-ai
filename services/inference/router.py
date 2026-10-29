"""
ModelRouter — Central model dispatch layer.

Provides four typed accessors:

  getOCRModel()        → PaddleOCR (not an Ollama model; returns config)
  getVisionModel()     → Qwen3-VL-2B  (Ollama)
  getGenerationModel() → Qwen3-8B Q4_K_M  (Ollama, with 4B fallback)
  getEmbeddingModel()  → nomic-embed-text  (Ollama)

VRAM management:
  Before loading a vision or generation model, the router checks free VRAM.
  If the two exclusive models would exceed the budget, the currently-loaded
  exclusive model is unloaded first.

All public methods return an InferenceResponse so callers never import
Ollama-specific code.  To swap to a different backend, only this module
and ollama_client.py need to change.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from services.inference.config import settings
from services.inference.gpu import get_free_vram_mib, get_gpu_info, is_vram_safe
from services.inference.ollama_client import OllamaClient, OllamaError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Typed response objects
# ---------------------------------------------------------------------------

@dataclass
class InferenceResponse:
    """Normalised response from any model call."""

    text: str                          # primary text output
    model: str                         # model name actually used
    role: str                          # "generation" | "vision" | "embeddings" | "ocr"
    latency_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    embeddings: list[list[float]] = field(default_factory=list)
    raw: dict = field(default_factory=dict)
    success: bool = True
    error: str = ""

    def as_json(self) -> dict:
        """Parse text as JSON. Raises ValueError if not valid JSON."""
        return json.loads(self.text)

    def try_as_json(self) -> Optional[dict]:
        """Parse text as JSON, return None on failure."""
        try:
            return json.loads(self.text)
        except (json.JSONDecodeError, ValueError):
            return None


# ---------------------------------------------------------------------------
# VRAM requirements (approximate, in MiB)
# ---------------------------------------------------------------------------

_VRAM_REQUIREMENTS: dict[str, int] = {
    "qwen3-vl:2b-instruct-q4_K_M": 2500,
    "qwen2.5-vl:3b-q4_K_M": 3000,
    "qwen3:8b-q4_K_M": 5000,
    "qwen3:4b-q4_K_M": 3000,
    "nomic-embed-text": 300,
    "mxbai-embed-large": 400,
    # qwen2.5:3b is already installed — use as text fallback if needed
    "qwen2.5:3b": 2000,
}

# Models that cannot co-reside with each other
_EXCLUSIVE_ROLES = {"vision", "generation"}


class ModelRouter:
    """
    Central model dispatch layer.

    Thread-safe via a lock around VRAM-sensitive load/unload operations.

    Parameters
    ----------
    ollama_url:
        Ollama server base URL.
    auto_pull:
        If True, automatically pull missing models.
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        auto_pull: bool = False,
    ):
        self._client = OllamaClient(
            base_url=ollama_url or settings.ollama_base_url,
            timeout=float(settings.timeout_seconds),
        )
        self._auto_pull = auto_pull
        self._lock = threading.Lock()
        self._loaded_exclusive: Optional[str] = None  # currently loaded exclusive model

    # ------------------------------------------------------------------
    # Public accessors
    # ------------------------------------------------------------------

    def getOCRModel(self) -> dict:
        """
        Returns OCR configuration (PaddleOCR — not an Ollama model).

        The ingestion pipeline uses this to get runtime OCR parameters.
        """
        return {
            "provider": "paddleocr",
            "use_gpu": True,
            "lang": "en",
            "vision_fallback_model": self._resolve_vision_model(),
        }

    def getVisionModel(self) -> str:
        """Resolve and return the active vision model name."""
        return self._resolve_vision_model()

    def getGenerationModel(self) -> str:
        """Resolve and return the active generation model name."""
        return self._resolve_generation_model()

    def getEmbeddingModel(self) -> str:
        """Resolve and return the active embedding model name."""
        return self._resolve_embedding_model()

    # ------------------------------------------------------------------
    # Inference methods
    # ------------------------------------------------------------------

    def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> InferenceResponse:
        """
        Generate text using the configured generation model.

        Falls back to the fallback model if the primary is unavailable.
        """
        model = self._ensure_model_loaded("generation")
        if temperature is None:
            temperature = 0.7
        if max_tokens is None:
            max_tokens = 2048

        try:
            raw = self._client.generate(
                model=model,
                prompt=prompt,
                system=system,
                temperature=temperature,
                max_tokens=max_tokens,
                keep_alive=settings.default_keep_alive,
                json_mode=json_mode,
            )
            return _build_response(raw, model=model, role="generation")
        except OllamaError as exc:
            logger.error("Generation failed (%s): %s", model, exc)
            return InferenceResponse(
                text="",
                model=model,
                role="generation",
                success=False,
                error=str(exc),
            )

    def chat(
        self,
        messages: list[dict],
        system: str = "",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        images: Optional[list] = None,
    ) -> InferenceResponse:
        """
        Chat completion — uses vision model when images are provided,
        otherwise uses the generation model.
        """
        if images:
            model = self._ensure_model_loaded("vision")
            role = "vision"
        else:
            model = self._ensure_model_loaded("generation")
            role = "generation"

        if temperature is None:
            temperature = 0.1 if images else 0.7
        if max_tokens is None:
            max_tokens = 1024

        try:
            raw = self._client.chat(
                model=model,
                messages=messages,
                system=system,
                temperature=temperature,
                max_tokens=max_tokens,
                keep_alive="0" if images else settings.default_keep_alive,
                json_mode=json_mode,
                images=images,
            )
            return _build_chat_response(raw, model=model, role=role)
        except OllamaError as exc:
            logger.error("%s chat failed (%s): %s", role, model, exc)
            return InferenceResponse(
                text="",
                model=model,
                role=role,
                success=False,
                error=str(exc),
            )

    def embed(
        self,
        text: str | list[str],
    ) -> InferenceResponse:
        """Generate embeddings for the given text."""
        model = self._resolve_embedding_model()
        try:
            raw = self._client.embed(
                model=model,
                input_text=text,
                keep_alive="10m",
            )
            embeddings = raw.get("embeddings", [])
            return InferenceResponse(
                text="",
                model=model,
                role="embeddings",
                latency_ms=raw.get("_latency_ms", 0.0),
                embeddings=embeddings,
                raw=raw,
                success=True,
            )
        except OllamaError as exc:
            logger.error("Embedding failed (%s): %s", model, exc)
            return InferenceResponse(
                text="",
                model=model,
                role="embeddings",
                success=False,
                error=str(exc),
            )

    def analyze_image(
        self,
        image: bytes | str | Path,
        prompt: str,
        system: str = "",
        json_mode: bool = False,
    ) -> InferenceResponse:
        """
        Convenience wrapper: vision model call for a single image.

        Uses keep_alive=0 to immediately release VRAM after inference.
        """
        return self.chat(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            images=[image],
            json_mode=json_mode,
        )

    # ------------------------------------------------------------------
    # Model status
    # ------------------------------------------------------------------

    def status(self) -> dict:
        """Return status of all models including availability."""
        available = {m["name"] for m in self._client.list_models()}
        running = {m["name"] for m in self._client.running_models()}

        generation_model = self._resolve_generation_model()
        vision_model = self._resolve_vision_model()
        embedding_model = self._resolve_embedding_model()

        return {
            "ollama_healthy": self._client.health(),
            "models": {
                "generation": {
                    "name": generation_model,
                    "available": _name_in(generation_model, available),
                    "loaded": _name_in(generation_model, running),
                },
                "vision": {
                    "name": vision_model,
                    "available": _name_in(vision_model, available),
                    "loaded": _name_in(vision_model, running),
                },
                "embeddings": {
                    "name": embedding_model,
                    "available": _name_in(embedding_model, available),
                    "loaded": _name_in(embedding_model, running),
                },
            },
            "gpu": [g.to_dict() for g in get_gpu_info()],
        }

    def unload_all_exclusive(self) -> None:
        """Unload all exclusive (large) models from VRAM."""
        for name in [settings.generation_model, settings.vision_model,
                     settings.fallback_model, settings.vision_model_fallback]:
            try:
                self._client.unload_model(name)
            except Exception:
                pass
        self._loaded_exclusive = None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_vision_model(self) -> str:
        available = {m["name"] for m in self._client.list_models()}
        primary = settings.vision_model
        fallback = settings.vision_model_fallback
        if _name_in(primary, available):
            return primary
        if _name_in(fallback, available):
            logger.info("Vision primary (%s) not found; using fallback (%s)", primary, fallback)
            return fallback
        return primary  # will be pulled if auto_pull is set

    def _resolve_generation_model(self) -> str:
        available = {m["name"] for m in self._client.list_models()}
        primary = settings.generation_model
        fallback = settings.fallback_model
        # Also try the already-installed qwen2.5:3b as last resort
        last_resort = "qwen2.5:3b"
        if _name_in(primary, available):
            return primary
        if _name_in(fallback, available):
            logger.info(
                "Generation primary (%s) not found; using fallback (%s)", primary, fallback
            )
            return fallback
        if last_resort in available:
            logger.info("Using qwen2.5:3b as emergency fallback")
            return last_resort
        return primary

    def _resolve_embedding_model(self) -> str:
        available = {m["name"] for m in self._client.list_models()}
        primary = settings.embeddings_model
        fallback = settings.embeddings_model_fallback
        if _name_in(primary, available):
            return primary
        if _name_in(fallback, available):
            return fallback
        return primary

    def _ensure_model_loaded(self, role: str) -> str:
        """
        Return the model name for the given role, managing VRAM conflicts.

        If role is exclusive (vision/generation) and a different exclusive
        model is currently loaded, unload it first if VRAM is tight.
        """
        if role == "vision":
            model = self._resolve_vision_model()
        elif role == "generation":
            model = self._resolve_generation_model()
        else:
            return self._resolve_embedding_model()

        if role not in _EXCLUSIVE_ROLES:
            return model

        with self._lock:
            # Check if we need to unload an exclusive model first
            if self._loaded_exclusive and self._loaded_exclusive != model:
                required_mib = _VRAM_REQUIREMENTS.get(model, 4000)
                if not is_vram_safe(required_mib, settings.vram_safety_margin_mib):
                    logger.info(
                        "VRAM tight — unloading %s before loading %s",
                        self._loaded_exclusive,
                        model,
                    )
                    self._client.unload_model(self._loaded_exclusive)
                    time.sleep(0.5)  # give Ollama time to release

            # Pull if missing and auto_pull is enabled
            if self._auto_pull and not self._client.model_available(model):
                logger.info("Auto-pulling missing model: %s", model)
                self._client.pull_model(model)

            self._loaded_exclusive = model

        return model


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------

def _build_response(raw: dict, model: str, role: str) -> InferenceResponse:
    """Build an InferenceResponse from a /api/generate response dict."""
    text = raw.get("response", "")
    
    success = True
    error = ""
    # If text is empty, it might be because generation was spent entirely on thinking
    if not text and raw.get("done_reason") == "length" and raw.get("thinking"):
        success = False
        error = "Generation failed: hit length limit during reasoning before producing final answer."

    return InferenceResponse(
        text=text,
        model=raw.get("model", model),
        role=role,
        latency_ms=raw.get("_latency_ms", 0.0),
        prompt_tokens=raw.get("prompt_eval_count", 0),
        completion_tokens=raw.get("eval_count", 0),
        total_tokens=raw.get("prompt_eval_count", 0) + raw.get("eval_count", 0),
        raw=raw,
        success=success,
        error=error,
    )


def _build_chat_response(raw: dict, model: str, role: str) -> InferenceResponse:
    """Build an InferenceResponse from a /api/chat response dict."""
    message = raw.get("message", {})
    text = message.get("content", "")
    
    success = True
    error = ""
    # If text is empty, it might be because generation was spent entirely on thinking
    if not text and raw.get("done_reason") == "length" and message.get("thinking"):
        success = False
        error = "Generation failed: hit length limit during reasoning before producing final answer."

    return InferenceResponse(
        text=text,
        model=raw.get("model", model),
        role=role,
        latency_ms=raw.get("_latency_ms", 0.0),
        prompt_tokens=raw.get("prompt_eval_count", 0),
        completion_tokens=raw.get("eval_count", 0),
        total_tokens=raw.get("prompt_eval_count", 0) + raw.get("eval_count", 0),
        raw=raw,
        success=success,
        error=error,
    )


def _name_in(model_name: str, available: set[str]) -> bool:
    """Check if a model name (possibly without tag) is in the available set."""
    if model_name in available:
        return True
    # Partial match: "qwen3:8b-q4_K_M" matches "qwen3:8b-q4_k_m" (case insensitive)
    ml = model_name.lower()
    return any(a.lower() == ml or a.lower().startswith(ml.split(":")[0]) for a in available)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_router: Optional[ModelRouter] = None


def get_router() -> ModelRouter:
    """Return the global ModelRouter singleton."""
    global _router
    if _router is None:
        _router = ModelRouter(
            ollama_url=settings.ollama_base_url,
            auto_pull=False,
        )
    return _router
