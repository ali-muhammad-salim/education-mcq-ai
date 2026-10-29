"""
Ollama HTTP client.

Wraps all raw HTTP calls to Ollama in a typed, retrying client.
Exposes the primitives needed by the ModelRouter:

  - generate()       → POST /api/generate
  - chat()           → POST /api/chat
  - embed()          → POST /api/embed
  - unload()         → POST /api/generate with keep_alive=0
  - list_models()    → GET  /api/tags
  - pull_model()     → POST /api/pull
  - model_running()  → GET  /api/ps

All methods raise OllamaError on failure.
The interface is OpenAI-compatible at the router layer above this.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from pathlib import Path
from typing import Any, Iterator, Optional

import httpx

logger = logging.getLogger(__name__)


class OllamaError(Exception):
    """Raised when an Ollama API call fails."""


class OllamaClient:
    """
    Typed HTTP wrapper around the Ollama REST API.

    Parameters
    ----------
    base_url:
        Ollama server URL (default: http://localhost:11434).
    timeout:
        Request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        timeout: float = 120.0,
    ):
        self._base = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base,
            timeout=httpx.Timeout(timeout, connect=5.0),
        )

    # ------------------------------------------------------------------
    # Model lifecycle
    # ------------------------------------------------------------------

    def list_models(self) -> list[dict]:
        """Return all models known to Ollama."""
        resp = self._get("/api/tags")
        return resp.get("models", [])

    def running_models(self) -> list[dict]:
        """Return models currently loaded in VRAM."""
        try:
            resp = self._get("/api/ps")
            return resp.get("models", [])
        except OllamaError:
            return []

    def model_available(self, model_name: str) -> bool:
        """Check if a model is downloaded in Ollama."""
        models = self.list_models()
        names = [m.get("name", "") for m in models]
        return any(
            n == model_name or n.startswith(model_name.split(":")[0])
            for n in names
        )

    def pull_model(self, model_name: str) -> None:
        """
        Pull (download) a model from the Ollama registry.

        This is a blocking call that streams progress until completion.
        """
        logger.info("Pulling model: %s", model_name)
        payload = {"name": model_name, "stream": False}
        self._post("/api/pull", payload)
        logger.info("Model pulled: %s", model_name)

    def unload_model(self, model_name: str) -> None:
        """
        Force-unload a model from VRAM by setting keep_alive=0.
        """
        logger.info("Unloading model from VRAM: %s", model_name)
        try:
            self._post(
                "/api/generate",
                {
                    "model": model_name,
                    "prompt": "",
                    "keep_alive": 0,
                    "stream": False,
                },
            )
        except OllamaError as exc:
            logger.debug("Unload returned error (may be OK): %s", exc)

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def generate(
        self,
        model: str,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        keep_alive: str = "5m",
        json_mode: bool = False,
        stream: bool = False,
        think: bool = False,
    ) -> dict:
        """
        Raw text generation via POST /api/generate.

        Returns the complete Ollama response dict including:
          response, model, total_duration, eval_count, prompt_eval_count
        """
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "keep_alive": keep_alive,
            "think": think,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if system:
            payload["system"] = system
        if json_mode:
            payload["format"] = "json"

        t0 = time.perf_counter()
        resp = self._post("/api/generate", payload)
        latency_ms = (time.perf_counter() - t0) * 1000

        resp["_latency_ms"] = round(latency_ms, 1)
        return resp

    def chat(
        self,
        model: str,
        messages: list[dict],
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        keep_alive: str = "5m",
        json_mode: bool = False,
        images: Optional[list[str | bytes | Path]] = None,
        think: bool = False,
    ) -> dict:
        """
        Chat completion via POST /api/chat.

        Parameters
        ----------
        messages:
            OpenAI-style list of {"role": ..., "content": ...}.
        images:
            Optional list of image data (file paths, raw bytes, or base64 strings).
            When provided, the last user message gets the images attached.
            Used for vision model calls.

        Returns the complete Ollama response dict.
        """
        # Encode images if provided
        if images:
            messages = list(messages)
            last_user = None
            for i in range(len(messages) - 1, -1, -1):
                if messages[i].get("role") == "user":
                    last_user = i
                    break
            if last_user is not None:
                encoded_images = [_encode_image(img) for img in images]
                messages[last_user] = {
                    **messages[last_user],
                    "images": encoded_images,
                }

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "keep_alive": keep_alive,
            "think": think,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if json_mode:
            payload["format"] = "json"

        t0 = time.perf_counter()
        resp = self._post("/api/chat", payload)
        latency_ms = (time.perf_counter() - t0) * 1000

        resp["_latency_ms"] = round(latency_ms, 1)
        return resp

    def embed(
        self,
        model: str,
        input_text: str | list[str],
        keep_alive: str = "10m",
    ) -> dict:
        """
        Generate embeddings via POST /api/embed.

        Returns {"embeddings": [[...], ...], "model": ..., "_latency_ms": ...}
        """
        payload = {
            "model": model,
            "input": input_text if isinstance(input_text, list) else [input_text],
            "keep_alive": keep_alive,
        }
        t0 = time.perf_counter()
        resp = self._post("/api/embed", payload)
        latency_ms = (time.perf_counter() - t0) * 1000
        resp["_latency_ms"] = round(latency_ms, 1)
        return resp

    def health(self) -> bool:
        """Return True if the Ollama server is reachable."""
        try:
            self._client.get("/", timeout=3.0)
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Private HTTP helpers
    # ------------------------------------------------------------------

    def _get(self, path: str) -> dict:
        try:
            resp = self._client.get(path)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            raise OllamaError(
                f"GET {path} → {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise OllamaError(f"GET {path} connection error: {exc}") from exc

    def _post(self, path: str, payload: dict) -> dict:
        try:
            resp = self._client.post(path, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            raise OllamaError(
                f"POST {path} → {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise OllamaError(f"POST {path} connection error: {exc}") from exc


# ---------------------------------------------------------------------------
# Image encoding helpers
# ---------------------------------------------------------------------------

def _encode_image(img: str | bytes | Path) -> str:
    """Return a base64-encoded string suitable for Ollama vision calls."""
    if isinstance(img, str):
        # Already base64? Or file path?
        if len(img) > 260 and not Path(img).exists():
            return img  # assume already base64
        img = Path(img)

    if isinstance(img, Path):
        img = img.read_bytes()

    if isinstance(img, bytes):
        return base64.b64encode(img).decode("utf-8")

    raise TypeError(f"Unsupported image type: {type(img)}")
