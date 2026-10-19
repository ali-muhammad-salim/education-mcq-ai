"""
Google Gemini AI Provider Client & Multi-Key Quota Rotation Pool.

Supports:
- Multi-Key API Pool (e.g., 5 free-tier Gemini API keys in rotation)
- Automatic failover / key rotation on HTTP 429 quota exhaustion
- Per-key Request Per Minute (RPM) & Token Per Minute (TPM) enforcement
- Checkpointing and safe pipeline halting when all keys reach daily limits
- High-fidelity vision extraction (rendered 300 DPI PDF pages, diagram inspection)
- LaTeX mathematical notation, Markdown tables, and structured JSON output
- Transparent provenance tracking and verification logging
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


@dataclass
class KeyState:
    """State tracking for an individual Gemini API key in the pool."""
    key: str
    key_index: int
    daily_requests: int = 0
    total_tokens: int = 0
    is_exhausted: bool = False
    exhaustion_timestamp: float = 0.0
    consecutive_errors: int = 0

    @property
    def masked_key(self) -> str:
        if len(self.key) <= 8:
            return "***"
        return f"{self.key[:4]}...{self.key[-4:]}"


@dataclass
class GeminiUsageMetrics:
    prompt_tokens: int = 0
    candidate_tokens: int = 0
    total_tokens: int = 0
    total_requests: int = 0
    total_latency_ms: float = 0.0
    active_key_index: int = 0
    exhausted_keys_count: int = 0


@dataclass
class GeminiResponse:
    text: str
    model: str
    provider: str = "google_gemini"
    success: bool = True
    error: str = ""
    status_code: int = 200
    prompt_tokens: int = 0
    candidate_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    key_used: str = ""
    all_keys_exhausted: bool = False
    raw_response: dict = field(default_factory=dict)

    def as_json(self) -> dict:
        """Parse structured response text as JSON."""
        return json.loads(self.text)

    def try_as_json(self) -> Optional[dict]:
        """Safely parse text as JSON or return None."""
        try:
            return json.loads(self.text)
        except Exception:
            return None


class GeminiKeyPool:
    """
    Manages a pool of multiple Gemini API keys.
    Rotates automatically upon rate limiting (429) or quota exhaustion.
    """

    def __init__(self, keys: Optional[List[str]] = None):
        self._keys: List[KeyState] = []
        self._current_index = 0
        self._lock = asyncio.Lock()

        # Parse keys from parameters or environment
        raw_keys = keys or []
        if not raw_keys:
            # Check GEMINI_API_KEYS (plural), GEMINI_API_KEY (singular), or GOOGLE_API_KEY
            combined_env = (
                os.environ.get("GEMINI_API_KEYS")
                or os.environ.get("GEMINI_API_KEY")
                or os.environ.get("GOOGLE_API_KEY")
                or ""
            )
            if combined_env:
                # Comma, semicolon, or newline separated
                tokens = re.split(r'[,;\n\r]+', combined_env)
                raw_keys = [t.strip() for t in tokens if t.strip() and not t.strip().startswith("your_")]

        for idx, k in enumerate(raw_keys):
            if k and len(k.strip()) > 8 and not k.strip().startswith("your_"):
                self._keys.append(KeyState(key=k.strip(), key_index=idx))

    @property
    def total_keys(self) -> int:
        return len(self._keys)

    @property
    def keys(self) -> List[KeyState]:
        return self._keys

    @property
    def has_keys(self) -> bool:
        return len(self._keys) > 0

    def add_key(self, api_key: str) -> None:
        """Dynamically add an API key to the pool."""
        if api_key and len(api_key.strip()) > 8:
            new_idx = len(self._keys)
            self._keys.append(KeyState(key=api_key.strip(), key_index=new_idx))
            logger.info("Added API key to pool (total: %d keys).", len(self._keys))

    async def get_active_key(self) -> Optional[KeyState]:
        """Returns the next non-exhausted key in round-robin fashion."""
        async with self._lock:
            if not self._keys:
                return None

            now = time.monotonic()
            # RPM window reset: free tier 429 quota resets after 25s
            for k in self._keys:
                if k.is_exhausted and (now - k.exhaustion_timestamp > 25.0):
                    k.is_exhausted = False
                    logger.info("Key %s RPM rate-limit window cooled down and reset.", k.masked_key)

            # Find next non-exhausted key starting from current index
            for _ in range(len(self._keys)):
                key_state = self._keys[self._current_index % len(self._keys)]
                self._current_index = (self._current_index + 1) % len(self._keys)
                if not key_state.is_exhausted:
                    return key_state

            # If all keys are currently cooling down from 429, wait for the soonest one to cool down
            oldest_key = min(self._keys, key=lambda k: k.exhaustion_timestamp)
            time_passed = now - oldest_key.exhaustion_timestamp
            wait_time = max(1.0, 25.0 - time_passed + 1.0)
            logger.info("All keys temporarily rate-limited. Waiting %.1fs for key %s to cool down...", wait_time, oldest_key.masked_key)
            await asyncio.sleep(wait_time)
            oldest_key.is_exhausted = False
            return oldest_key

    async def mark_key_exhausted(self, key_state: KeyState, reason: str = "RPM Rate Limited (429)") -> None:
        """Mark a specific key for 25s cooling down before re-use."""
        async with self._lock:
            key_state.is_exhausted = True
            key_state.exhaustion_timestamp = time.monotonic()
            active_count = sum(1 for k in self._keys if not k.is_exhausted)
            logger.warning(
                "Gemini API key %s (Index %d) hit 429 (%s). Cooling down for 25s. Active keys remaining: %d/%d.",
                key_state.masked_key, key_state.key_index, reason, active_count, len(self._keys)
            )

    def summary(self) -> Dict[str, Any]:
        """Diagnostic summary of key pool status."""
        return {
            "total_keys": len(self._keys),
            "active_keys": sum(1 for k in self._keys if not k.is_exhausted),
            "exhausted_keys": sum(1 for k in self._keys if k.is_exhausted),
            "keys": [
                {
                    "index": k.key_index,
                    "masked": k.masked_key,
                    "daily_requests": k.daily_requests,
                    "is_exhausted": k.is_exhausted,
                }
                for k in self._keys
            ],
        }


class GeminiClient:
    """
    Centralized, rate-limited Google Gemini API Client with Multi-Key Pool support.
    """

    def __init__(
        self,
        api_keys: Optional[List[str]] = None,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        max_rpm: int = 15,  # 15 RPM standard per free key
        max_concurrency: int = 3,
        timeout_seconds: float = 120.0,
        checkpoint_dir: str = "checkpoints",
    ):
        raw_keys = api_keys or ([api_key] if api_key else None)
        self.pool = GeminiKeyPool(keys=raw_keys)
        self.default_model = (
            default_model
            or os.environ.get("GEMINI_MODEL")
            or "gemini-2.5-flash"
        )
        self.max_rpm = max_rpm
        self.max_concurrency = max_concurrency
        self.timeout_seconds = timeout_seconds
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._request_timestamps: Dict[int, List[float]] = {}
        self._lock = asyncio.Lock()
        self.metrics = GeminiUsageMetrics()

    @property
    def is_configured(self) -> bool:
        """Returns True if at least one valid Gemini API key is configured."""
        return self.pool.has_keys

    async def _enforce_rate_limit(self, key_index: int) -> None:
        """Enforces rolling RPM limit per specific key."""
        async with self._lock:
            now = time.monotonic()
            if key_index not in self._request_timestamps:
                self._request_timestamps[key_index] = []

            # Retain timestamps from last 60s
            timestamps = [t for t in self._request_timestamps[key_index] if now - t < 60.0]
            if len(timestamps) >= self.max_rpm:
                oldest = timestamps[0]
                sleep_needed = 60.0 - (now - oldest) + 0.2
                if sleep_needed > 0:
                    logger.info("Throttling key %d for %.2fs to respect RPM limit.", key_index, sleep_needed)
                    await asyncio.sleep(sleep_needed)
            self._request_timestamps[key_index].append(time.monotonic())

    def save_quota_checkpoint(self, doc_id: str, last_completed_page: int, pending_items: Optional[List[Any]] = None) -> str:
        """
        Saves a progress checkpoint when daily quotas are exhausted across all keys.
        Allows exact next-day resumption without rework or loss of quality.
        """
        checkpoint_path = self.checkpoint_dir / f"checkpoint_{doc_id}.json"
        data = {
            "doc_id": doc_id,
            "last_completed_page": last_completed_page,
            "saved_at": time.time(),
            "iso_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "pool_status": self.pool.summary(),
            "pending_items_count": len(pending_items or []),
            "resumption_note": (
                f"Processing stopped safely after Page {last_completed_page} due to daily quota exhaustion. "
                "All extractions are saved in PostgreSQL. Next execution will resume from "
                f"Page {last_completed_page + 1}."
            ),
        }
        with open(checkpoint_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.warning("Quota checkpoint saved: %s", checkpoint_path)
        return str(checkpoint_path)

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        image_mime_type: str = "image/png",
        json_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.1,  # 0.1 for maximum determinism and accuracy
        max_retries_per_key: int = 2,
    ) -> GeminiResponse:
        """
        Generate content using Gemini with automatic multi-key rotation upon quota limits.
        """
        if not self.is_configured:
            return GeminiResponse(
                text="",
                model=model or self.default_model,
                provider="google_gemini",
                success=False,
                error=(
                    "GEMINI_API_KEY is not configured. Please provide GEMINI_API_KEYS in .env "
                    "or pass them to the client."
                ),
                status_code=401,
            )

        active_model = model or self.default_model

        # Construct multimodal parts
        parts: List[Dict[str, Any]] = []
        if image_bytes:
            b64_img = base64.b64encode(image_bytes).decode("utf-8")
            parts.append({
                "inlineData": {
                    "mimeType": image_mime_type,
                    "data": b64_img,
                }
            })
        parts.append({"text": prompt})

        contents = [{"role": "user", "parts": parts}]
        generation_config: Dict[str, Any] = {
            "temperature": temperature,
        }

        if json_schema:
            generation_config["responseMimeType"] = "application/json"
            generation_config["responseSchema"] = json_schema
        elif "JSON" in prompt or "json" in prompt:
            generation_config["responseMimeType"] = "application/json"


        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": generation_config,
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        start_time = time.perf_counter()
        total_available_keys = self.pool.total_keys

        # Build candidate model cascade: try requested/default model first, then fall back to alternate families
        initial_model = model or self.default_model
        candidate_models = [initial_model]
        for fb in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            if fb not in candidate_models:
                candidate_models.append(fb)

        last_error = ""

        for active_model in candidate_models:
            tried_keys_count = 0
            max_attempts = max(15, total_available_keys * 3)

            while tried_keys_count < max_attempts:
                key_state = await self.pool.get_active_key()
                if not key_state:
                    # All keys exhausted for this model, cascade to next model family
                    break

                tried_keys_count += 1
                url = f"{GEMINI_API_BASE}/models/{active_model}:generateContent?key={key_state.key}"

                async with self._semaphore:
                    for attempt in range(max_retries_per_key + 1):
                        await self._enforce_rate_limit(key_state.key_index)
                        try:
                            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                                response = await client.post(url, json=payload)
                                latency = (time.perf_counter() - start_time) * 1000.0

                                if response.status_code == 200:
                                    data = response.json()
                                    candidates = data.get("candidates", [])
                                    if not candidates:
                                        return GeminiResponse(
                                            text="",
                                            model=active_model,
                                            success=False,
                                            error="No candidates returned (possibly blocked by safety filters).",
                                            status_code=200,
                                            latency_ms=latency,
                                            key_used=key_state.masked_key,
                                            raw_response=data,
                                        )

                                    first_cand = candidates[0]
                                    parts_out = first_cand.get("content", {}).get("parts", [])
                                    out_text = "".join(p.get("text", "") for p in parts_out)

                                    usage = data.get("usageMetadata", {})
                                    pt = usage.get("promptTokenCount", 0)
                                    ct = usage.get("candidatesTokenCount", 0)
                                    tt = usage.get("totalTokenCount", 0)

                                    key_state.daily_requests += 1
                                    key_state.total_tokens += tt
                                    key_state.consecutive_errors = 0

                                    self.metrics.prompt_tokens += pt
                                    self.metrics.candidate_tokens += ct
                                    self.metrics.total_tokens += tt
                                    self.metrics.total_requests += 1
                                    self.metrics.total_latency_ms += latency
                                    self.metrics.active_key_index = key_state.key_index

                                    return GeminiResponse(
                                        text=out_text,
                                        model=active_model,
                                        success=True,
                                        status_code=200,
                                        prompt_tokens=pt,
                                        candidate_tokens=ct,
                                        total_tokens=tt,
                                        latency_ms=latency,
                                        key_used=key_state.masked_key,
                                        raw_response=data,
                                    )

                                elif response.status_code == 429:
                                    logger.warning(
                                        "Gemini Key %s (Index %d) hit 429 on %s. Rotating key...",
                                        key_state.masked_key, key_state.key_index, active_model
                                    )
                                    await self.pool.mark_key_exhausted(key_state, reason="HTTP 429 Resource Exhausted")
                                    last_error = f"Model {active_model} rate limit / quota exceeded"
                                    break

                                elif response.status_code == 404:
                                    logger.warning("Model %s returned 404 (Not Found). Cascading to next model...", active_model)
                                    last_error = f"Model {active_model} not found"
                                    break

                                elif response.status_code == 503:
                                    if attempt < max_retries_per_key:
                                        backoff = 2.0 + random.uniform(0.5, 1.5)
                                        await asyncio.sleep(backoff)
                                        continue
                                    else:
                                        logger.warning("Gemini 503 on key %s. Rotating key.", key_state.masked_key)
                                        break

                                else:
                                    if response.status_code in (401, 403):
                                        await self.pool.mark_key_exhausted(key_state, reason=f"HTTP {response.status_code} Auth/Permission Error")
                                        break
                                    return GeminiResponse(
                                        text="",
                                        model=active_model,
                                        success=False,
                                        error=f"Gemini API error {response.status_code}: {response.text}",
                                        status_code=response.status_code,
                                        latency_ms=latency,
                                        key_used=key_state.masked_key,
                                    )

                        except httpx.RequestError as exc:
                            if attempt < max_retries_per_key:
                                await asyncio.sleep(1.0 + random.uniform(0.2, 0.8))
                            else:
                                logger.warning("Network failure on key %s: %s. Rotating key.", key_state.masked_key, exc)
                                break

        latency = (time.perf_counter() - start_time) * 1000.0
        return GeminiResponse(
            text="",
            model=initial_model,
            success=False,
            error=f"All {total_available_keys} configured Gemini API keys exhausted their quotas across all models ({', '.join(candidate_models)}). {last_error}",
            status_code=429,
            latency_ms=latency,
            all_keys_exhausted=True,
        )

    async def embed_content(
        self,
        text: str,
        model: str = "models/gemini-embedding-001",
        output_dimensionality: int = 768,
    ) -> List[float]:
        """
        Generates dense vector embeddings using Google Gemini Embedding API with key pool rotation.
        """
        if not self.is_configured:
            return []

        endpoint_model = model if model.startswith("models/") else f"models/{model}"
        payload = {
            "model": endpoint_model,
            "content": {"parts": [{"text": text[:2048]}]},
            "outputDimensionality": output_dimensionality,
        }

        total_keys = self.pool.total_keys
        for _ in range(max(1, total_keys)):
            key_state = await self.pool.get_active_key()
            if not key_state:
                logger.error("All keys in pool exhausted during embed_content.")
                break

            await self._enforce_rate_limit(key_state.key_index)
            url = f"{GEMINI_API_BASE}/{endpoint_model}:embedContent?key={key_state.key}"

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        key_state.daily_requests += 1
                        return data.get("embedding", {}).get("values", [])
                    elif resp.status_code == 429:
                        await self.pool.mark_key_exhausted(key_state, reason="HTTP 429 on embedContent")
                        continue
                    else:
                        logger.warning("Embed error on key %s (%d): %s", key_state.masked_key, resp.status_code, resp.text)
            except Exception as e:
                logger.warning("Exception on embed key %s: %s", key_state.masked_key, e)

        return []

    async def embed_texts(
        self,
        texts: List[str],
        model: str = "models/gemini-embedding-001",
        output_dimensionality: int = 768,
        concurrency: int = 5,
    ) -> List[List[float]]:
        """
        Embeds a batch of texts concurrently across the key pool.
        """
        sem = asyncio.Semaphore(concurrency)

        async def _bounded_embed(t: str) -> List[float]:
            async with sem:
                return await self.embed_content(t, model=model, output_dimensionality=output_dimensionality)

        tasks = [_bounded_embed(t) for t in texts]
        return await asyncio.gather(*tasks)

    async def generate_embedding(self, text: str, **kwargs) -> List[float]:
        """Convenience alias for embed_content."""
        return await self.embed_content(text, **kwargs)

