"""
Inference service integration tests.

Tests real calls to the locally-running Ollama server.
Each test records: latency, VRAM usage, success/failure, model, token counts.

Hardware context: Quadro RTX 4000 Max-Q (8 GB VRAM)
Available model:  qwen2.5:3b (1.9 GB, already installed)

These tests:
  1. Text generation (simple)
  2. Structured JSON generation
  3. Image understanding (vision)
  4. OCR fallback
  5. Embedding generation

Run:
    pytest services/inference/tests/ -v -s
    # or to skip real calls if Ollama is down:
    pytest services/inference/tests/ -v -s -m "not live"
"""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Optional

import pytest
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Test result recorder
# ---------------------------------------------------------------------------

@dataclass
class InferenceRecord:
    """Normalised inference test result record."""

    test_name: str
    model: str
    role: str
    success: bool
    latency_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    vram_free_mib_before: int = 0
    vram_free_mib_after: int = 0
    error: str = ""
    notes: str = ""


_RECORDS: list[InferenceRecord] = []


def _record(rec: InferenceRecord) -> InferenceRecord:
    _RECORDS.append(rec)
    return rec


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def ollama_available() -> bool:
    """Check if Ollama is reachable before running live tests."""
    from services.inference.ollama_client import OllamaClient
    client = OllamaClient()
    return client.health()


@pytest.fixture(scope="session")
def router():
    """Return a configured ModelRouter."""
    from services.inference.router import ModelRouter
    return ModelRouter(auto_pull=False)


@pytest.fixture(scope="session")
def available_models(router) -> set[str]:
    """Return the set of model names installed in Ollama."""
    try:
        models = router._client.list_models()
        return {m["name"] for m in models}
    except Exception:
        return set()


@pytest.fixture(scope="session")
def generation_model(router, available_models) -> str:
    """Resolve the best available generation model."""
    return router._resolve_generation_model()


@pytest.fixture(scope="session")
def embedding_model(router, available_models) -> str:
    """Resolve the best available embedding model."""
    return router._resolve_embedding_model()


@pytest.fixture(scope="session")
def vision_model(router, available_models) -> str:
    """Resolve the best available vision model."""
    return router._resolve_vision_model()


def _synthetic_page_image(
    text: str = "F = ma\nNewton's Second Law",
    width: int = 600,
    height: int = 400,
) -> bytes:
    """Create a synthetic document page image (PNG bytes)."""
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw a border
    draw.rectangle([10, 10, width - 10, height - 10], outline=(0, 0, 0), width=2)
    # Title bar
    draw.rectangle([10, 10, width - 10, 60], fill=(30, 60, 120))
    draw.text((20, 20), "Physics Textbook — Chapter 3", fill=(255, 255, 255))
    # Body text
    y = 80
    for line in text.splitlines():
        draw.text((30, y), line, fill=(0, 0, 0))
        y += 30
    # A simple diagram: box labelled "Force diagram"
    draw.rectangle([50, y + 10, 200, y + 80], outline=(0, 0, 200), width=2)
    draw.text((55, y + 35), "F →", fill=(0, 0, 200))
    draw.text((50, y + 90), "Figure 1: Force diagram", fill=(80, 80, 80))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _b64_image(img_bytes: bytes) -> str:
    return base64.b64encode(img_bytes).decode("utf-8")


def _get_free_vram() -> int:
    from services.inference.gpu import get_free_vram_mib
    return get_free_vram_mib()


# ---------------------------------------------------------------------------
# Helper to skip if Ollama is unavailable
# ---------------------------------------------------------------------------

def skip_if_no_ollama(ollama_available):
    if not ollama_available:
        pytest.skip("Ollama server not reachable")


def skip_if_model_missing(model_name: str, available_models: set[str]):
    from services.inference.router import _name_in
    if not _name_in(model_name, available_models):
        pytest.skip(f"Model {model_name!r} not available in Ollama")


# ===========================================================================
# TEST CLASS 1: Connectivity
# ===========================================================================

class TestConnectivity:
    """Verify the Ollama server is reachable and models are listed."""

    def test_ollama_health(self, ollama_available):
        assert ollama_available, (
            "Ollama is not running. Start it with: ollama serve"
        )

    def test_list_models(self, router, ollama_available):
        skip_if_no_ollama(ollama_available)
        models = router._client.list_models()
        assert isinstance(models, list), "Expected a list of models"
        print(f"\n  Installed models: {[m['name'] for m in models]}")

    def test_gpu_detection(self):
        from services.inference.gpu import get_gpu_info, get_free_vram_mib
        gpus = get_gpu_info()
        print(f"\n  GPUs: {[g.name for g in gpus]}")
        if gpus:
            g = gpus[0]
            print(f"  VRAM: {g.total_mib} MiB total, {g.free_mib} MiB free")
            assert g.total_mib > 0
        # Test passes even with no GPU (CPU inference)

    def test_model_router_instantiation(self, router):
        assert router is not None
        gen = router.getGenerationModel()
        vis = router.getVisionModel()
        emb = router.getEmbeddingModel()
        print(f"\n  Generation: {gen}")
        print(f"  Vision:     {vis}")
        print(f"  Embeddings: {emb}")
        assert isinstance(gen, str) and gen
        assert isinstance(vis, str) and vis
        assert isinstance(emb, str) and emb


# ===========================================================================
# TEST CLASS 2: Text Generation
# ===========================================================================

class TestTextGeneration:
    """Test 1: Simple text generation."""

    def test_simple_text_generation(self, router, ollama_available, generation_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(generation_model, available_models)

        vram_before = _get_free_vram()
        t0 = time.perf_counter()

        resp = router.generate(
            prompt="What is Newton's Second Law of Motion? Answer in one sentence.",
            system="You are a physics tutor. Be concise.",
            temperature=0.1,
            max_tokens=100,
        )

        latency_ms = (time.perf_counter() - t0) * 1000
        vram_after = _get_free_vram()

        rec = _record(InferenceRecord(
            test_name="simple_text_generation",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            prompt_tokens=resp.prompt_tokens,
            completion_tokens=resp.completion_tokens,
            total_tokens=resp.total_tokens,
            vram_free_mib_before=vram_before,
            vram_free_mib_after=vram_after,
            error=resp.error,
        ))

        print(f"\n  Model:    {rec.model}")
        print(f"  Response: {resp.text[:120]!r}")
        print(f"  Latency:  {rec.latency_ms:.0f} ms")
        print(f"  Tokens:   {rec.total_tokens}")
        print(f"  VRAM delta: {vram_before - vram_after} MiB used")

        assert resp.success, f"Generation failed: {resp.error}"
        assert len(resp.text) > 5, "Response is too short"
        assert "force" in resp.text.lower() or "mass" in resp.text.lower() or "acceleration" in resp.text.lower(), \
            f"Response does not mention Newton's law: {resp.text!r}"


# ===========================================================================
# TEST CLASS 3: Structured JSON Generation
# ===========================================================================

class TestStructuredGeneration:
    """Test 2: Structured JSON output."""

    def test_json_generation(self, router, ollama_available, generation_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(generation_model, available_models)

        prompt = """
Generate a physics MCQ in the following JSON format:
{
  "question": "...",
  "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "answer": "A",
  "explanation": "..."
}
Topic: Newton's Second Law. Return only valid JSON.
"""
        vram_before = _get_free_vram()

        resp = router.generate(
            prompt=prompt,
            temperature=0.2,
            max_tokens=300,
            json_mode=True,
        )

        vram_after = _get_free_vram()

        rec = _record(InferenceRecord(
            test_name="json_generation",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            total_tokens=resp.total_tokens,
            vram_free_mib_before=vram_before,
            vram_free_mib_after=vram_after,
            error=resp.error,
        ))

        print(f"\n  Model:    {rec.model}")
        print(f"  Latency:  {rec.latency_ms:.0f} ms")
        print(f"  Tokens:   {rec.total_tokens}")
        print(f"  Raw:      {resp.text[:200]!r}")

        assert resp.success, f"JSON generation failed: {resp.error}"

        # Try to parse as JSON
        parsed = resp.try_as_json()
        assert parsed is not None, f"Response is not valid JSON: {resp.text!r}"
        print(f"  Parsed:   {json.dumps(parsed, indent=2)[:300]}")

        # Validate expected structure
        assert "question" in parsed, "Missing 'question' field"
        assert "options" in parsed, "Missing 'options' field"
        assert "answer" in parsed, "Missing 'answer' field"

    def test_json_with_system_prompt(self, router, ollama_available, generation_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(generation_model, available_models)

        resp = router.generate(
            prompt='List 3 physics topics as JSON: {"topics": [...]}',
            system="Return only valid JSON. No explanations.",
            temperature=0.1,
            max_tokens=100,
            json_mode=True,
        )

        assert resp.success, f"Failed: {resp.error}"
        parsed = resp.try_as_json()
        assert parsed is not None, f"Invalid JSON: {resp.text!r}"
        assert "topics" in parsed
        assert isinstance(parsed["topics"], list)
        assert len(parsed["topics"]) >= 1


# ===========================================================================
# TEST CLASS 4: Vision / Image Understanding
# ===========================================================================

class TestVisionModel:
    """Test 3: Image understanding with the vision model."""

    def test_image_description(self, router, ollama_available, vision_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(vision_model, available_models)

        img_bytes = _synthetic_page_image("F = ma\nNewton's Second Law\nForce = Mass × Acceleration")
        b64 = _b64_image(img_bytes)

        vram_before = _get_free_vram()

        resp = router.analyze_image(
            image=b64,
            prompt="Describe what you see in this document page. List any text, equations, and diagrams.",
            system="You are an educational document analyser. Be precise and concise.",
        )

        vram_after = _get_free_vram()

        rec = _record(InferenceRecord(
            test_name="image_description",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            total_tokens=resp.total_tokens,
            vram_free_mib_before=vram_before,
            vram_free_mib_after=vram_after,
            error=resp.error,
        ))

        print(f"\n  Model:    {rec.model}")
        print(f"  Response: {resp.text[:300]!r}")
        print(f"  Latency:  {rec.latency_ms:.0f} ms")

        if not resp.success:
            # Vision model may not be installed — mark as SKIP instead of FAIL
            if "not found" in resp.error.lower() or "pull" in resp.error.lower():
                pytest.skip(f"Vision model not installed: {resp.error}")
            pytest.fail(f"Vision failed: {resp.error}")

        assert len(resp.text) > 5

    def test_vision_json_extraction(self, router, ollama_available, vision_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(vision_model, available_models)

        img_bytes = _synthetic_page_image("Q1. (a) Calculate force if m=5kg, a=3m/s². [2 marks]")
        b64 = _b64_image(img_bytes)

        resp = router.analyze_image(
            image=b64,
            prompt='Extract any questions from this image as JSON: {"questions": [{"number": "...", "text": "..."}]}',
            json_mode=True,
        )

        _record(InferenceRecord(
            test_name="vision_json_extraction",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            total_tokens=resp.total_tokens,
            error=resp.error,
        ))

        if not resp.success:
            if "not found" in resp.error.lower():
                pytest.skip(f"Vision model not installed: {resp.error}")
            pytest.fail(f"Vision JSON extraction failed: {resp.error}")

        print(f"\n  Response: {resp.text[:200]!r}")


# ===========================================================================
# TEST CLASS 5: OCR Fallback
# ===========================================================================

class TestOCRFallback:
    """Test 4: Vision model used as OCR fallback for difficult regions."""

    def test_low_confidence_region_via_vision(self, router, ollama_available, vision_model, available_models):
        """
        Simulate a low-confidence OCR region being sent to the vision model.
        This is what the ingestion pipeline does when OCR confidence < threshold.
        """
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(vision_model, available_models)

        # Simulate a 'difficult' region: handwritten-style text
        img = Image.new("RGB", (400, 100), (240, 240, 220))  # yellowed paper
        draw = ImageDraw.Draw(img)
        # Draw messy text to simulate low OCR confidence
        draw.text((10, 30), "∫₀^∞ e^(-x²) dx = √π/2", fill=(30, 30, 30))
        buf = BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        b64 = _b64_image(img_bytes)

        vram_before = _get_free_vram()

        resp = router.analyze_image(
            image=b64,
            prompt=(
                "This is a scan of a mathematical equation that OCR failed to read. "
                "What mathematical expression is shown? Return the exact LaTeX."
            ),
            system="Return only the LaTeX expression. No prose.",
        )

        vram_after = _get_free_vram()

        rec = _record(InferenceRecord(
            test_name="ocr_fallback_vision",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            total_tokens=resp.total_tokens,
            vram_free_mib_before=vram_before,
            vram_free_mib_after=vram_after,
            error=resp.error,
            notes="Simulated low-confidence OCR region with integral equation",
        ))

        print(f"\n  Model:    {rec.model}")
        print(f"  Latency:  {rec.latency_ms:.0f} ms")
        print(f"  Result:   {resp.text!r}")

        if not resp.success:
            if "not found" in resp.error.lower():
                pytest.skip(f"Vision model not installed: {resp.error}")
            pytest.fail(f"OCR fallback via vision failed: {resp.error}")

        assert len(resp.text) > 0

    def test_ocr_config_from_router(self, router):
        """Verify getOCRModel() returns valid configuration."""
        config = router.getOCRModel()
        assert config["provider"] == "paddleocr"
        assert "use_gpu" in config
        assert "vision_fallback_model" in config
        print(f"\n  OCR config: {config}")


# ===========================================================================
# TEST CLASS 6: Embeddings
# ===========================================================================

class TestEmbeddings:
    """Test 5: Embedding generation."""

    def test_single_text_embedding(self, router, ollama_available, embedding_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(embedding_model, available_models)

        vram_before = _get_free_vram()

        resp = router.embed("What is Newton's Second Law of Motion?")

        vram_after = _get_free_vram()

        rec = _record(InferenceRecord(
            test_name="single_embedding",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            vram_free_mib_before=vram_before,
            vram_free_mib_after=vram_after,
            error=resp.error,
        ))

        print(f"\n  Model:    {rec.model}")
        print(f"  Latency:  {rec.latency_ms:.0f} ms")

        if not resp.success:
            if "not found" in resp.error.lower():
                pytest.skip(f"Embedding model not installed: {resp.error}")
            pytest.fail(f"Embedding failed: {resp.error}")

        assert len(resp.embeddings) == 1, "Expected one embedding vector"
        emb = resp.embeddings[0]
        assert len(emb) > 100, f"Embedding dimension too low: {len(emb)}"
        print(f"  Dimension: {len(emb)}")
        print(f"  Sample:    {emb[:5]}")

    def test_batch_embeddings(self, router, ollama_available, embedding_model, available_models):
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(embedding_model, available_models)

        texts = [
            "Newton's Second Law: F = ma",
            "Ohm's Law: V = IR",
            "Einstein's mass-energy equivalence: E = mc²",
        ]

        resp = router.embed(texts)

        if not resp.success:
            if "not found" in resp.error.lower():
                pytest.skip(f"Embedding model not installed: {resp.error}")
            pytest.fail(f"Batch embedding failed: {resp.error}")

        assert len(resp.embeddings) == len(texts), \
            f"Expected {len(texts)} embeddings, got {len(resp.embeddings)}"
        print(f"\n  Batch size: {len(texts)}")
        print(f"  Dimension:  {len(resp.embeddings[0])}")
        print(f"  Latency:    {resp.latency_ms:.0f} ms")

        _record(InferenceRecord(
            test_name="batch_embeddings",
            model=resp.model,
            role=resp.role,
            success=resp.success,
            latency_ms=resp.latency_ms,
            total_tokens=len(texts),
            error=resp.error,
        ))

    def test_embedding_cosine_similarity(self, router, ollama_available, embedding_model, available_models):
        """Related physics topics should have higher similarity than unrelated."""
        skip_if_no_ollama(ollama_available)
        skip_if_model_missing(embedding_model, available_models)

        import math

        def cosine(a, b):
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a))
            norm_b = math.sqrt(sum(y * y for y in b))
            return dot / (norm_a * norm_b + 1e-9)

        texts = [
            "Newton's Second Law F = ma",
            "Force equals mass times acceleration",
            "The capital city of France is Paris",
        ]

        resp = router.embed(texts)
        if not resp.success:
            pytest.skip(f"Embedding model not installed: {resp.error}")

        emb_newton = resp.embeddings[0]
        emb_fma = resp.embeddings[1]
        emb_paris = resp.embeddings[2]

        sim_related = cosine(emb_newton, emb_fma)
        sim_unrelated = cosine(emb_newton, emb_paris)

        print(f"\n  Similarity (Newton vs F=ma):  {sim_related:.4f}")
        print(f"  Similarity (Newton vs Paris): {sim_unrelated:.4f}")

        _record(InferenceRecord(
            test_name="embedding_cosine_similarity",
            model=resp.model,
            role="embeddings",
            success=sim_related > sim_unrelated,
            latency_ms=resp.latency_ms,
            notes=f"related={sim_related:.4f} unrelated={sim_unrelated:.4f}",
        ))

        assert sim_related > sim_unrelated, (
            f"Related texts should have higher similarity than unrelated ones. "
            f"Got: related={sim_related:.4f}, unrelated={sim_unrelated:.4f}"
        )


# ===========================================================================
# Summary fixture — prints a results table after all tests
# ===========================================================================

@pytest.fixture(scope="session", autouse=True)
def print_test_summary():
    """Print a formatted results table after all inference tests complete."""
    yield
    if not _RECORDS:
        return
    print("\n\n" + "=" * 90)
    print("  INFERENCE TEST RESULTS")
    print("=" * 90)
    header = f"{'Test':<35} {'Model':<22} {'OK':>3} {'ms':>7} {'tokens':>7} {'VRAM d':>8}"
    print(header)
    print("-" * 90)
    for r in _RECORDS:
        ok = "PASS" if r.success else "FAIL"
        vram_delta = r.vram_free_mib_before - r.vram_free_mib_after
        model_short = r.model[:22] if r.model else "—"
        row = (
            f"{r.test_name:<35} {model_short:<22} {ok:>3} "
            f"{r.latency_ms:>7.0f} {r.total_tokens:>7} {vram_delta:>7} MiB"
        )
        print(row)
        if r.error:
            print(f"  {'':35} Error: {r.error[:60]}")
        if r.notes:
            print(f"  {'':35} Note:  {r.notes[:60]}")
    print("=" * 90)
    passed = sum(1 for r in _RECORDS if r.success)
    failed = len(_RECORDS) - passed
    print(f"  {passed}/{len(_RECORDS)} passed, {failed} failed")
    print("=" * 90)
