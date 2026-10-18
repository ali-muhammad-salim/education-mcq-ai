"""
Configuration for the Document Intelligence Pipeline.

Settings are read from environment variables (with sensible defaults so
the pipeline works out-of-the-box for local development).
"""

from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class IngestionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INGEST_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    from pydantic import Field
    # Database
    database_url: str = Field(
        default="postgresql+psycopg://prisma:prisma_password@localhost:5432/mcqs_db",
        validation_alias="DATABASE_URL"
    )

    # Primary Extraction Strategy
    primary_engine: str = "gemini"              # "gemini" (AI-First, highest accuracy) or "local_hybrid"
    gemini_page_render_dpi: int = 300           # High-resolution 300 DPI for crystal-clear formulas & diagrams
    gemini_model: str = "gemini-3.5-flash"      # Top-tier multimodal model
    gemini_multi_pass_verification: bool = True # Run independent Pass B verification on every question

    # OCR / Local Fallback Settings
    ocr_language: str = "en"
    ocr_use_gpu: bool = True                    # falls back to CPU automatically
    ocr_page_render_dpi: int = 300              # DPI for PDF → image rendering
    ocr_confidence_high: float = 0.90
    ocr_confidence_medium: float = 0.75
    ocr_confidence_low: float = 0.60            # below this → NEEDS_REVIEW

    # Vision fallback triggers (for local engine)
    vision_confidence_threshold: float = 1.1   # Set > 1.0 to FORCE Qwen-VL for 100% of text regions
    vision_formula_threshold: float = 1.1      # Force Qwen-VL for 100% of formulas
    vision_enabled: bool = True

    # Ollama vision model (Local fallback)
    ollama_base_url: str = "http://localhost:11434"
    ollama_vision_model: str = "qwen2.5vl:7b"  # 7B model for maximum accuracy
    ollama_timeout_seconds: int = 120

    # Media storage
    media_root: Path = Path("media")
    diagram_subdir: str = "diagrams"

    # Past-paper heuristics
    past_paper_question_pattern: str = (
        r"(?:Q|Question|q)\.?\s*(\d+)\s*(?:\(([a-zA-Z]+)\))?"
    )
    past_paper_marks_pattern: str = r"\[(\d+)\s*(?:marks?)?\]"

    # Processing limits
    max_pages: int = 1000                        # safety cap


settings = IngestionSettings()
