"""
Inference service settings.

All values can be overridden via environment variables.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class InferenceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INFER_",
        env_file=".env",
        extra="ignore",
    )

    # Ollama server
    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    timeout_seconds: int = 120
    default_keep_alive: str = "5m"

    # VRAM management
    vram_limit_mib: int = 7500
    vram_safety_margin_mib: int = 1024

    # Model name overrides
    vision_model: str = "qwen3-vl:2b-instruct-q4_K_M"
    vision_model_fallback: str = "qwen2.5-vl:3b-q4_K_M"

    generation_model: str = "qwen3:8b-q4_K_M"
    fallback_model: str = "qwen3:4b-q4_K_M"

    embeddings_model: str = "nomic-embed-text"
    embeddings_model_fallback: str = "mxbai-embed-large"

    # Model config file
    models_config_path: Path = Path("config/models.yaml")

    # API server
    api_host: str = "0.0.0.0"
    api_port: int = 8001

    # Feature flags
    vision_enabled: bool = True
    generation_enabled: bool = True
    embeddings_enabled: bool = True


@lru_cache(maxsize=1)
def get_settings() -> InferenceSettings:
    return InferenceSettings()


settings = get_settings()
